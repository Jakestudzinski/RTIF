import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getClientBySecret } from "../clients";

/**
 * POST /api/payment-gateway/cancel-intent
 *
 * Multi-tenant: identifies the calling client, verifies the PaymentIntent
 * belongs to that client (via metadata.clientId), then cancels it.
 *
 * Uses the client's own Stripe keys if configured, otherwise falls back to
 * the gateway's default keys.
 *
 * Request body:
 *   paymentIntentId - Stripe PaymentIntent ID to cancel
 *
 * Response:
 *   success         - boolean
 *   paymentIntentId - the canceled PaymentIntent ID
 *   status          - the resulting Stripe status
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and identify the client
    const authHeader = request.headers.get("x-gateway-secret");
    if (!authHeader) {
      console.error("[PAYMENT-GATEWAY] Missing x-gateway-secret header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getClientBySecret(authHeader);
    if (!client) {
      console.error("[PAYMENT-GATEWAY] Unknown client secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json(
        { error: "paymentIntentId is required" },
        { status: 400 }
      );
    }

    console.log(
      `[PAYMENT-GATEWAY] [${client.id}] Cancel request for PI: ${paymentIntentId}`
    );

    // Use client-specific Stripe keys if present, otherwise fall back to gateway defaults
    const stripeSecretKey =
      client.stripeSecretKey || process.env.STRIPE_SECRET_KEY || "";

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-01-28.clover",
    });

    // Retrieve the PI to verify ownership
    const paymentIntent =
      await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata?.clientId !== client.id) {
      console.error(
        `[PAYMENT-GATEWAY] [${client.id}] PI ${paymentIntentId} belongs to client "${paymentIntent.metadata?.clientId}", not "${client.id}"`
      );
      return NextResponse.json(
        { error: "Payment intent not found for this client" },
        { status: 403 }
      );
    }

    // Only cancel if the PI is in a cancellable state
    const cancellableStatuses = [
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "processing",
    ];
    if (!cancellableStatuses.includes(paymentIntent.status)) {
      console.log(
        `[PAYMENT-GATEWAY] [${client.id}] PI ${paymentIntentId} status is "${paymentIntent.status}" — not cancellable`
      );
      return NextResponse.json({
        success: false,
        status: paymentIntent.status,
        message: `PI is in "${paymentIntent.status}" state and cannot be canceled`,
      });
    }

    const canceled = await stripe.paymentIntents.cancel(paymentIntentId);

    console.log(
      `[PAYMENT-GATEWAY] [${client.id}] PI ${paymentIntentId} canceled (was ${paymentIntent.status})`
    );

    return NextResponse.json({
      success: true,
      paymentIntentId: canceled.id,
      status: canceled.status,
    });
  } catch (error) {
    console.error("[PAYMENT-GATEWAY] Error canceling payment intent:", error);
    return NextResponse.json(
      { error: "Failed to cancel payment intent" },
      { status: 500 }
    );
  }
}
