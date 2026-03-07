import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

const GATEWAY_SECRET = process.env.PAYMENT_GATEWAY_SECRET || "";

/**
 * POST /api/payment-gateway/cancel-intent
 *
 * Cancels a PaymentIntent that is no longer needed (e.g. when a replacement
 * PI was created because the update-intent endpoint wasn't available).
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
    // Authenticate the request
    const authHeader = request.headers.get("x-gateway-secret");
    if (!authHeader || authHeader !== GATEWAY_SECRET) {
      console.error("[PAYMENT-GATEWAY] Unauthorized cancel-intent request");
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
      `[PAYMENT-GATEWAY] Cancel request for PI: ${paymentIntentId}`
    );

    // Retrieve the PI to verify it belongs to this gateway
    const paymentIntent =
      await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata?.source !== "payment-gateway") {
      console.error(
        `[PAYMENT-GATEWAY] PI ${paymentIntentId} is not a gateway payment (source=${paymentIntent.metadata?.source})`
      );
      return NextResponse.json(
        { error: "Payment intent not found" },
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
        `[PAYMENT-GATEWAY] PI ${paymentIntentId} status is "${paymentIntent.status}" — not cancellable`
      );
      return NextResponse.json({
        success: false,
        status: paymentIntent.status,
        message: `PI is in "${paymentIntent.status}" state and cannot be canceled`,
      });
    }

    const canceled = await stripe.paymentIntents.cancel(paymentIntentId);

    console.log(
      `[PAYMENT-GATEWAY] PI ${paymentIntentId} canceled (was ${paymentIntent.status})`
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
