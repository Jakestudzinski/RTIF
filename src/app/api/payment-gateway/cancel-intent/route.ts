import { NextRequest, NextResponse } from "next/server";
import { getClientBySecret } from "../clients";
import { resolveProcessor } from "@/lib/processors";

/**
 * POST /api/payment-gateway/cancel-intent
 *
 * Multi-tenant: identifies the calling client, verifies the payment
 * intent/order belongs to that client, then cancels it.
 *
 * Request body:
 *   paymentIntentId - intent/order ID to cancel
 *
 * Response:
 *   success         - boolean
 *   paymentIntentId - the canceled intent/order ID
 *   status          - the resulting status
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

    const processor = resolveProcessor(client);
    console.log(
      `[PAYMENT-GATEWAY] [${client.id}] Cancel request via ${processor.name}: ${paymentIntentId}`
    );

    const result = await processor.cancelIntent(client, paymentIntentId);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel payment intent";
    console.error("[PAYMENT-GATEWAY] Error canceling payment intent:", error);

    if (message === "Payment intent not found for this client") {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to cancel payment intent" },
      { status: 500 }
    );
  }
}
