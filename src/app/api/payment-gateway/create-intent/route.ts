import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getClientBySecret } from "../clients";

const GATEWAY_REDIRECT_BASE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.research-tif.com";

/**
 * Determine the generic Stripe description based on order amount.
 */
function getDescription(amount: number): string {
  if (amount <= 100) return "Basic Technology Consultation";
  if (amount <= 500) return "Mid Tier Technology Consultation";
  return "All-In Consultation";
}

/**
 * POST /api/payment-gateway/create-intent
 *
 * Multi-tenant gateway: identifies the calling client by their shared secret
 * (x-gateway-secret header), creates a Stripe PaymentIntent with a generic
 * description, and stores the client ID in metadata for webhook/redirect routing.
 *
 * If the client has its own Stripe keys in clients.json, the PaymentIntent is
 * created on that client's Stripe account. If the client has a
 * connectedAccountId, the PaymentIntent is created on the platform account
 * with transfer_data routing funds to the connected account (minus the
 * platform fee). Otherwise falls back to the gateway's default Stripe keys.
 *
 * Request body:
 *   amount        - dollar amount (e.g. 149.99)
 *   ref           - opaque internal reference (e.g. order number or request ID)
 *
 * Response:
 *   clientSecret        - Stripe PaymentIntent client secret
 *   paymentIntentId     - Stripe PaymentIntent ID
 *   publishableKey      - The publishable key the frontend should use
 *   returnUrl           - Redirect URL through research-tif.com (for Klarna/Affirm)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and identify the client by their shared secret
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
    const { amount, ref } = body;

    // Validate amount
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Determine payment methods based on amount
    // Klarna and Affirm require minimum $35
    const paymentMethodTypes: string[] = ["card"];
    if (amount >= 35) {
      paymentMethodTypes.push("klarna");
      paymentMethodTypes.push("affirm");
    }

    const description = getDescription(amount);
    const amountInCents = Math.round(amount * 100);

    console.log(
      `[PAYMENT-GATEWAY] [${client.id}] Creating intent: $${amount.toFixed(2)} (${amountInCents} cents) — "${description}" ref=${ref || "none"}`
    );

    // Use client-specific Stripe keys if present, otherwise fall back to gateway defaults
    const stripeSecretKey =
      client.stripeSecretKey || process.env.STRIPE_SECRET_KEY || "";
    const stripePublishableKey =
      client.stripePublishableKey ||
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      "";

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-01-28.clover",
    });

    // Build the PaymentIntent create params
    const createParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: "usd",
      payment_method_types: paymentMethodTypes,
      description,
      metadata: {
        ref: ref || "",
        source: "payment-gateway",
        clientId: client.id,
      },
    };

    // If the client has a connected account, route funds via transfer_data
    // and charge a platform fee
    if (client.connectedAccountId) {
      const feeRate = client.platformFeeRate ?? 0.07;
      createParams.transfer_data = {
        destination: client.connectedAccountId,
      };
      createParams.application_fee_amount = Math.round(amountInCents * feeRate);

      console.log(
        `[PAYMENT-GATEWAY] [${client.id}] Connect transfer → ${client.connectedAccountId} (fee: ${(feeRate * 100).toFixed(1)}% = ${createParams.application_fee_amount} cents)`
      );
    }

    // Create PaymentIntent with ONLY generic info — no product details, no customer PII
    const paymentIntent = await stripe.paymentIntents.create(createParams);

    console.log(
      `[PAYMENT-GATEWAY] [${client.id}] Created: ${paymentIntent.id}`
    );

    // Build redirect URL — only contains the opaque ref. The redirect handler
    // resolves the client from the PaymentIntent metadata (Stripe appends
    // payment_intent= automatically), so no client data appears in the URL.
    const redirectUrl = `${GATEWAY_REDIRECT_BASE}/api/payment-gateway/redirect?ref=${encodeURIComponent(ref || "")}`;

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      publishableKey: stripePublishableKey,
      returnUrl: redirectUrl,
    });
  } catch (error) {
    console.error("[PAYMENT-GATEWAY] Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
