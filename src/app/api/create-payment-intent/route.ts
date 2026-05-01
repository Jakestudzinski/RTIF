import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const PRODUCTS: Record<string, { name: string; price: number }> = {
  basic: {
    name: "Basic Technology Consultation",
    price: 14900, // $149.00 in cents
  },
  mid: {
    name: "Mid Tier Technology Consultation",
    price: 49900, // $499.00
  },
  allin: {
    name: "All-In Consultation",
    price: 149900, // $1,499.00
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tier } = body;

    const product = PRODUCTS[tier];
    if (!product) {
      return NextResponse.json(
        { error: "Invalid product tier" },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: product.price,
      currency: "usd",
      description: product.name,
      metadata: {
        tier,
        source: "rtif-consultation",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Payment intent creation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
