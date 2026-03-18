import { NextRequest, NextResponse } from "next/server";
import { getClientBySecret } from "../clients";
import { resolveProcessor } from "@/lib/processors";

const GATEWAY_REDIRECT_BASE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.research-tif.com";

/**
 * POST /api/payment-gateway/create-intent
 *
 * Multi-tenant gateway: identifies the calling client by their shared secret
 * (x-gateway-secret header), creates a payment intent via the resolved
 * processor (Stripe or PayPal), and stores the client ID in metadata for
 * webhook/redirect routing.
 *
 * Request body:
 *   amount        - dollar amount (e.g. 149.99)
 *   ref           - opaque internal reference (e.g. order number or request ID)
 *
 * Response:
 *   clientSecret        - Stripe client secret or PayPal order ID
 *   paymentIntentId     - Stripe PaymentIntent ID or PayPal order ID
 *   publishableKey      - Stripe publishable key or PayPal client ID
 *   returnUrl           - Redirect URL through research-tif.com
 *   processor           - "stripe" or "paypal"
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

    // Validate amount — minimum $5 to prevent junk/test PIs
    if (!amount || typeof amount !== "number" || amount < 5) {
      console.warn(
        `[PAYMENT-GATEWAY] [${client.id}] Rejected: amount $${amount} below $5 minimum (ref=${ref || "none"})`
      );
      return NextResponse.json(
        { error: "Amount must be at least $5.00" },
        { status: 400 }
      );
    }

    const processor = resolveProcessor(client);
    console.log(
      `[PAYMENT-GATEWAY] [${client.id}] Using processor: ${processor.name}`
    );

    const returnUrl = `${GATEWAY_REDIRECT_BASE}/api/payment-gateway/redirect`;

    const result = await processor.createIntent(client, amount, ref || "", returnUrl);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[PAYMENT-GATEWAY] Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
