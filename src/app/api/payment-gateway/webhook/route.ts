import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const GATEWAY_SECRET = process.env.PAYMENT_GATEWAY_SECRET || "";
const PEPTIDE_STORE_WEBHOOK_URL = process.env.PEPTIDE_STORE_WEBHOOK_URL || "";

/**
 * POST /api/payment-gateway/webhook
 *
 * Receives Stripe webhook events for gateway payments and forwards
 * relevant events to the peptide store's callback endpoint.
 *
 * Only forwards events for PaymentIntents that have source=payment-gateway
 * in their metadata.
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

    // Verify the webhook signature
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

    // Only process payment_intent events
    if (
      event.type === "payment_intent.succeeded" ||
      event.type === "payment_intent.payment_failed"
    ) {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      // Only forward events for gateway payments
      if (paymentIntent.metadata?.source !== "payment-gateway") {
        console.log(
          `[GATEWAY-WEBHOOK] Skipping non-gateway payment: ${paymentIntent.id}`
        );
        return NextResponse.json({ received: true });
      }

      console.log(
        `[GATEWAY-WEBHOOK] Forwarding ${event.type} for ${paymentIntent.id} (ref: ${paymentIntent.metadata.ref})`
      );

      // Forward to the peptide store
      if (PEPTIDE_STORE_WEBHOOK_URL) {
        try {
          const callbackResponse = await fetch(PEPTIDE_STORE_WEBHOOK_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-gateway-secret": GATEWAY_SECRET,
            },
            body: JSON.stringify({
              event: event.type,
              paymentIntentId: paymentIntent.id,
              ref: paymentIntent.metadata.ref || "",
              status: paymentIntent.status,
              amount: paymentIntent.amount / 100, // Convert cents back to dollars
            }),
          });

          if (!callbackResponse.ok) {
            console.error(
              `[GATEWAY-WEBHOOK] Callback failed: ${callbackResponse.status}`
            );
          } else {
            console.log("[GATEWAY-WEBHOOK] Callback sent successfully");
          }
        } catch (callbackError) {
          console.error(
            "[GATEWAY-WEBHOOK] Failed to send callback:",
            callbackError
          );
          // Don't fail the webhook — Stripe will retry
        }
      } else {
        console.warn(
          "[GATEWAY-WEBHOOK] PEPTIDE_STORE_WEBHOOK_URL not configured"
        );
      }
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
