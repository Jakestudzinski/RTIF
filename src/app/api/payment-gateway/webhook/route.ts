import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("Webhook signature error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const callbackUrl = process.env.PEPTIDE_STORE_WEBHOOK_URL;
  const gatewaySecret = process.env.PAYMENT_GATEWAY_SECRET;

  if (!callbackUrl || !gatewaySecret) {
    console.error(
      "PEPTIDE_STORE_WEBHOOK_URL or PAYMENT_GATEWAY_SECRET is not configured"
    );
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await notifyPeptideStore(callbackUrl, gatewaySecret, {
          event: "payment_intent.succeeded",
          paymentIntentId: paymentIntent.id,
          ref: paymentIntent.metadata?.ref ?? null,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await notifyPeptideStore(callbackUrl, gatewaySecret, {
          event: "payment_intent.payment_failed",
          paymentIntentId: paymentIntent.id,
          ref: paymentIntent.metadata?.ref ?? null,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          failureMessage:
            paymentIntent.last_payment_error?.message ?? "Unknown failure",
        });
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Webhook processing error";
    console.error("Webhook processing error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function notifyPeptideStore(
  callbackUrl: string,
  gatewaySecret: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-gateway-secret": gatewaySecret,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(
      `Failed to notify peptide store (${response.status}): ${text}`
    );
    throw new Error(`Peptide store callback failed: ${response.status}`);
  }

  console.log("Successfully notified peptide store:", payload.event);
}
