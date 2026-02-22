import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const DESCRIPTION_TIERS = [
  { max: 10000, description: "Basic Technology Consultation" },
  { max: 50000, description: "Mid Tier Technology Consultation" },
  { max: Infinity, description: "All-In Consultation" },
];

function getGenericDescription(amountCents: number): string {
  for (const tier of DESCRIPTION_TIERS) {
    if (amountCents <= tier.max) {
      return tier.description;
    }
  }
  return "All-In Consultation";
}

export async function POST(req: NextRequest) {
  try {
    const gatewaySecret = process.env.PAYMENT_GATEWAY_SECRET;
    if (!gatewaySecret) {
      console.error("PAYMENT_GATEWAY_SECRET is not configured");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("x-gateway-secret");
    if (!authHeader || authHeader !== gatewaySecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { amount, ref } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number in cents." },
        { status: 400 }
      );
    }

    if (!ref || typeof ref !== "string") {
      return NextResponse.json(
        { error: "Invalid ref. Must be a non-empty string." },
        { status: 400 }
      );
    }

    const description = getGenericDescription(amount);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      description,
      metadata: { ref },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Payment gateway create-intent error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
