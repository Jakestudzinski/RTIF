import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

const GATEWAY_SECRET = process.env.PAYMENT_GATEWAY_SECRET || "";
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
 * Creates a Stripe PaymentIntent on research-tif.com's Stripe account
 * with a generic description.
 *
 * Request body:
 *   amount        - dollar amount (e.g. 149.99)
 *   ref           - opaque internal reference (e.g. order number or request ID)
 *
 * Response:
 *   clientSecret        - Stripe PaymentIntent client secret
 *   paymentIntentId     - Stripe PaymentIntent ID
 *   publishableKey      - The publishable key the frontend should use
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authHeader = request.headers.get("x-gateway-secret");
    if (!authHeader || authHeader !== GATEWAY_SECRET) {
      console.error("[PAYMENT-GATEWAY] Unauthorized request");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, ref } = body;

    // Validate amount
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
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
      `[PAYMENT-GATEWAY] Creating intent: $${amount.toFixed(2)} (${amountInCents} cents) — "${description}" ref=${ref || "none"}`
    );

    // Create PaymentIntent with ONLY generic info — no product details, no customer PII
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      payment_method_types: paymentMethodTypes,
      description,
      metadata: {
        ref: ref || "",
        source: "payment-gateway",
      },
    });

    console.log(`[PAYMENT-GATEWAY] Created: ${paymentIntent.id}`);

    // Build a redirect URL through research-tif.com — only contains the opaque ref,
    // never the client's domain. The redirect endpoint resolves the destination
    // from a server-side env var (GATEWAY_CLIENT_REDIRECT_URL).
    const redirectUrl = `${GATEWAY_REDIRECT_BASE}/api/payment-gateway/redirect?ref=${encodeURIComponent(ref || "")}`;

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
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
