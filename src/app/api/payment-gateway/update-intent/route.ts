import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getClientBySecret } from "../clients";

/**
 * Determine the generic Stripe description based on order amount.
 */
function getDescription(amount: number): string {
  if (amount <= 100) return "Basic Technology Consultation";
  if (amount <= 500) return "Mid Tier Technology Consultation";
  return "All-In Consultation";
}

/**
 * POST /api/payment-gateway/update-intent
 *
 * Multi-tenant: identifies the calling client, verifies the PaymentIntent
 * belongs to that client (via metadata.clientId), then updates the amount.
 *
 * Uses the client's own Stripe keys if configured, otherwise falls back to
 * the gateway's default keys.
 *
 * Request body:
 *   paymentIntentId - the Stripe PaymentIntent ID to update
 *   amount          - new dollar amount (e.g. 129.99)
 *
 * Response:
 *   success         - boolean
 *   paymentIntentId - the updated PaymentIntent ID
 *   amount          - the new amount in cents
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

    console.log(
      `[PAYMENT-GATEWAY] Authenticated client: ${client.id} (${client.label})`
    );

    const body = await request.json();
    const { paymentIntentId, amount } = body;

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json(
        { error: "paymentIntentId is required" },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const amountInCents = Math.round(amount * 100);
    const description = getDescription(amount);

    console.log(
      `[PAYMENT-GATEWAY] [${client.id}] Updating PI ${paymentIntentId}: $${amount.toFixed(2)} (${amountInCents} cents) — "${description}"`
    );

    // Use client-specific Stripe keys if present, otherwise fall back to gateway defaults
    const stripeSecretKey =
      client.stripeSecretKey || process.env.STRIPE_SECRET_KEY || "";

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-01-28.clover",
    });

    // Verify the PI belongs to this client before updating
    const existingPI = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (existingPI.metadata?.clientId !== client.id) {
      console.error(
        `[PAYMENT-GATEWAY] [${client.id}] PI ${paymentIntentId} does not belong to this client (metadata.clientId=${existingPI.metadata?.clientId})`
      );
      return NextResponse.json(
        { error: "Payment intent not found for this client" },
        { status: 403 }
      );
    }

    // Build update params
    const updateParams: Stripe.PaymentIntentUpdateParams = {
      amount: amountInCents,
      description,
    };

    // Recalculate the platform fee if this is a connected-account client
    if (client.connectedAccountId) {
      const feeRate = client.platformFeeRate ?? 0.07;
      updateParams.application_fee_amount = Math.round(amountInCents * feeRate);

      console.log(
        `[PAYMENT-GATEWAY] [${client.id}] Connect fee updated → ${updateParams.application_fee_amount} cents (${(feeRate * 100).toFixed(1)}%)`
      );
    }

    await stripe.paymentIntents.update(paymentIntentId, updateParams);

    console.log(
      `[PAYMENT-GATEWAY] [${client.id}] Updated PI ${paymentIntentId} to ${amountInCents} cents`
    );

    return NextResponse.json({
      success: true,
      paymentIntentId,
      amount: amountInCents,
    });
  } catch (error) {
    console.error("[PAYMENT-GATEWAY] Error updating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to update payment intent" },
      { status: 500 }
    );
  }
}
