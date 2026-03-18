import { NextRequest, NextResponse } from "next/server";
import { getClientById, GatewayClient } from "../clients";
import { resolveWebhookProcessor } from "@/lib/processors";

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
    // Don't fail the webhook — processor will retry
  }
}

/**
 * POST /api/payment-gateway/webhook
 *
 * Multi-tenant webhook: receives events from payment processors (Stripe,
 * PayPal), verifies the signature, reads the clientId from metadata,
 * looks up the client's webhook URL, and forwards the normalized event.
 *
 * Supports per-client webhook secrets via ?cid= query param.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Collect headers needed for verification
    const headers: Record<string, string> = {};
    const stripeSignature = request.headers.get("stripe-signature");
    if (stripeSignature) headers["stripe-signature"] = stripeSignature;
    // PayPal webhook headers (for future use)
    const paypalTransmissionId = request.headers.get("paypal-transmission-id");
    if (paypalTransmissionId) headers["paypal-transmission-id"] = paypalTransmissionId;
    const paypalTransmissionSig = request.headers.get("paypal-transmission-sig");
    if (paypalTransmissionSig) headers["paypal-transmission-sig"] = paypalTransmissionSig;
    const paypalTransmissionTime = request.headers.get("paypal-transmission-time");
    if (paypalTransmissionTime) headers["paypal-transmission-time"] = paypalTransmissionTime;
    const paypalCertUrl = request.headers.get("paypal-cert-url");
    if (paypalCertUrl) headers["paypal-cert-url"] = paypalCertUrl;
    const paypalAuthAlgo = request.headers.get("paypal-auth-algo");
    if (paypalAuthAlgo) headers["paypal-auth-algo"] = paypalAuthAlgo;

    if (!stripeSignature && !paypalTransmissionId) {
      console.error("[GATEWAY-WEBHOOK] Missing processor signature header");
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 400 }
      );
    }

    // Resolve which client sent via ?cid= (for per-client webhook secrets)
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get("cid");
    const cidClient = cid ? getClientById(cid) : null;

    // Determine which processor this webhook belongs to
    const processor = resolveWebhookProcessor(headers);

    console.log(
      `[GATEWAY-WEBHOOK] Processing ${processor.name} webhook${cidClient ? ` (cid: ${cidClient.id})` : ""}`
    );

    // Verify signature and parse the event
    let event;
    try {
      event = await processor.verifyWebhook(body, headers, cidClient);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      console.error(`[GATEWAY-WEBHOOK] ${message}`);
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    // null means the event was acknowledged but doesn't need forwarding
    if (!event) {
      return NextResponse.json({ received: true });
    }

    // Look up the client to forward to
    const client = getClientById(event.clientId);
    if (!client) {
      console.error(
        `[GATEWAY-WEBHOOK] Unknown clientId "${event.clientId}" for ${event.paymentIntentId}`
      );
      return NextResponse.json({ received: true });
    }

    console.log(
      `[GATEWAY-WEBHOOK] [${client.id}] Forwarding ${event.rawType} for ${event.paymentIntentId} (ref: ${event.ref})`
    );

    // Build the forwarded payload
    const payload: Record<string, unknown> = {
      event: event.rawType,
      paymentIntentId: event.paymentIntentId,
      ref: event.ref,
      status: event.status,
      amount: event.amount,
      processor: event.processor,
    };

    if (event.amountRefunded !== undefined) {
      payload.amountRefunded = event.amountRefunded;
    }

    await forwardToClient(client, payload);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[GATEWAY-WEBHOOK] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
