import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const PRODUCTS: Record<
  string,
  { name: string; description: string; price: number }
> = {
  basic: {
    name: "Basic Technology Consultation",
    description:
      "A focused 1-hour session covering technology assessment, recommendations, and a written summary.",
    price: 14900, // $149.00 in cents
  },
  mid: {
    name: "Mid Tier Technology Consultation",
    description:
      "A comprehensive half-day engagement including systems review, architecture planning, and a detailed roadmap.",
    price: 49900, // $499.00
  },
  allin: {
    name: "All-In Consultation",
    description:
      "Full-service multi-day consultation with hands-on systems build planning, fulfillment strategy, and ongoing support.",
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.nextUrl.origin}/success`,
      cancel_url: `${req.nextUrl.origin}/#pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
