import { NextRequest, NextResponse } from "next/server";
import { getClientBySecret } from "../clients";
import { resolveProcessor } from "@/lib/processors";

/**
 * POST /api/payment-gateway/update-intent
 *
 * Multi-tenant: identifies the calling client, verifies the payment
 * intent/order belongs to that client, then updates the amount.
 *
 * Request body:
 *   paymentIntentId - the intent/order ID to update
 *   amount          - new dollar amount (e.g. 129.99)
 *
 * Response:
 *   success         - boolean
 *   paymentIntentId - the updated intent/order ID
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

    const processor = resolveProcessor(client);
    console.log(
      `[PAYMENT-GATEWAY] [${client.id}] Using processor: ${processor.name}`
    );

    const result = await processor.updateIntent(client, paymentIntentId, amount);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update payment intent";
    console.error("[PAYMENT-GATEWAY] Error updating payment intent:", error);

    // Ownership verification failure → 403
    if (message === "Payment intent not found for this client") {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to update payment intent" },
      { status: 500 }
    );
  }
}
