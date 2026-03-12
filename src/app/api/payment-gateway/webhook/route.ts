import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getClientById, GatewayClient } from "../clients";

// Events we don't need to forward — acknowledge silently
const IGNORED_EVENTS = [
  "payment_intent.created",
  "charge.succeeded",
  "charge.updated",
  "charge.failed",
];

/**
 * Build a Stripe instance for a given client (per-client keys) or fall back
 * to the gateway's default keys.
 */
function stripeForClient(client: GatewayClient | null): Stripe {
  const key =
    client?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || "";
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

/**
 * Resolve the webhook signing secret. If a `?cid=` query param is present and
 * that client has its own `stripeWebhookSecret`, use it. Otherwise fall back
 * to the gateway's default STRIPE_WEBHOOK_SECRET.
 */
function resolveWebhookSecret(request: NextRequest): {
  secret: string;
  client: GatewayClient | null;
} {
  const { searchParams } = new URL(request.url);
  const cid = searchParams.get("cid");
  if (cid) {
    const client = getClientById(cid);
    if (client?.stripeWebhookSecret) {
      return { secret: client.stripeWebhookSecret, client };
    }
  }
  return {
    secret: process.env.STRIPE_WEBHOOK_SECRET || "",
    client: null,
  };
}

/**
 * Forward an event payload to a client's webhook URL.
 */
async function forwardToClient(
  client: GatewayClient,
  payload: Record<string, unknown>
): Promise<void> {
  if (!client.webhookUrl) {
    console.warn(
      `[GATEWAY-WEBHOOK] [${client.id}] No webhookUrl configured`
    );
    return;
  }

  try {
    const res = await fetch(client.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-secret": client.secret,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(
        `[GATEWAY-WEBHOOK] [${client.id}] Callback failed: ${res.status}`
      );
    } else {
      console.log(
        `[GATEWAY-WEBHOOK] [${client.id}] Callback sent successfully`
      );
    }
  } catch (err) {
    console.error(
      `[GATEWAY-WEBHOOK] [${client.id}] Failed to send callback:`,
      err
    );
    // Don't fail the webhook — Stripe will retry
  }
}

/**
 * POST /api/payment-gateway/webhook
 *
 * Multi-tenant webhook: receives Stripe events, reads the clientId from
 * PaymentIntent metadata, looks up the client's webhook URL from clients.json,
 * and forwards the event to the correct client.
 *
 * Supports per-client Stripe webhook secrets via ?cid= query param
 * (recommended: set the webhook URL in Stripe Dashboard to
 *  research-tif.com/api/payment-gateway/webhook?cid=<client-id>)
 *
 * Handled events:
 *   payment_intent.succeeded
 *   payment_intent.payment_failed
 *   charge.refunded
 *   charge.refund.updated
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[GATEWAY-WEBHOOK] Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Resolve which webhook secret to use (per-client or default)
    const { secret: webhookSecret, client: cidClient } =
      resolveWebhookSecret(request);

    // We need a Stripe instance to verify the signature — use the cid client's
    // keys if available, otherwise the gateway default
    const stripe = stripeForClient(cidClient);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[GATEWAY-WEBHOOK] Signature verification failed:", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    console.log(
      `[GATEWAY-WEBHOOK] Received event: ${event.type} (${event.id})`
    );

    // ── Payment Intent events ────────────────────────────────────────────
    if (
      event.type === "payment_intent.succeeded" ||
      event.type === "payment_intent.payment_failed"
    ) {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      if (paymentIntent.metadata?.source !== "payment-gateway") {
        console.log(
          `[GATEWAY-WEBHOOK] Skipping non-gateway payment: ${paymentIntent.id}`
        );
        return NextResponse.json({ received: true });
      }

      const clientId = paymentIntent.metadata.clientId;
      if (!clientId) {
        console.error(
          `[GATEWAY-WEBHOOK] No clientId in metadata for PI: ${paymentIntent.id}`
        );
        return NextResponse.json({ received: true });
      }

      const client = getClientById(clientId);
      if (!client) {
        console.error(
          `[GATEWAY-WEBHOOK] Unknown clientId "${clientId}" for PI: ${paymentIntent.id}`
        );
        return NextResponse.json({ received: true });
      }

      console.log(
        `[GATEWAY-WEBHOOK] [${client.id}] Forwarding ${event.type} for ${paymentIntent.id} (ref: ${paymentIntent.metadata.ref})`
      );

      await forwardToClient(client, {
        event: event.type,
        paymentIntentId: paymentIntent.id,
        ref: paymentIntent.metadata.ref || "",
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
      });

      return NextResponse.json({ received: true });
    }

    // ── Refund events ────────────────────────────────────────────────────
    if (
      event.type === "charge.refunded" ||
      event.type === "charge.refund.updated"
    ) {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

      if (!paymentIntentId) {
        console.log(
          `[GATEWAY-WEBHOOK] Skipping ${event.type} — no linked PaymentIntent`
        );
        return NextResponse.json({ received: true });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (paymentIntent.metadata?.source !== "payment-gateway") {
        console.log(
          `[GATEWAY-WEBHOOK] Skipping non-gateway refund: ${paymentIntentId}`
        );
        return NextResponse.json({ received: true });
      }

      const clientId = paymentIntent.metadata.clientId;
      const client = clientId ? getClientById(clientId) : null;
      if (!client) {
        console.error(
          `[GATEWAY-WEBHOOK] Unknown clientId "${clientId}" for refund PI: ${paymentIntentId}`
        );
        return NextResponse.json({ received: true });
      }

      console.log(
        `[GATEWAY-WEBHOOK] [${client.id}] Forwarding ${event.type} for ${paymentIntentId} (ref: ${paymentIntent.metadata.ref})`
      );

      await forwardToClient(client, {
        event: event.type,
        paymentIntentId,
        ref: paymentIntent.metadata.ref || "",
        status: charge.status,
        amount: paymentIntent.amount / 100,
        amountRefunded: charge.amount_refunded / 100,
      });

      return NextResponse.json({ received: true });
    }

    // ── Acknowledged / unhandled events ──────────────────────────────────
    if (IGNORED_EVENTS.includes(event.type)) {
      console.log(
        `[GATEWAY-WEBHOOK] Acknowledged (no action needed): ${event.type}`
      );
    } else {
      console.log(`[GATEWAY-WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[GATEWAY-WEBHOOK] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
