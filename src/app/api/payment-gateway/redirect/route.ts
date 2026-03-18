import { NextRequest, NextResponse } from "next/server";
import { getClientById, getAllClients } from "../clients";
import { getProcessorsForRedirect } from "@/lib/processors";

/**
 * GET /api/payment-gateway/redirect
 *
 * Multi-tenant redirect: payment processors use this as the return_url for
 * redirect-based payment methods (Klarna, Affirm, PayPal, etc.).
 *
 * No client data appears in the URL. The client is resolved by retrieving the
 * payment from processor metadata. The client's actual destination comes from
 * clients.json.
 *
 * Query params (set by processor or the gateway — no client info):
 *   ref              - opaque reference for logging
 *   payment_intent   - appended by Stripe automatically
 *   redirect_status  - appended by Stripe automatically
 *   token            - PayPal order token (future)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref") || "";

  // Stripe appends these params automatically
  const paymentIntentId = searchParams.get("payment_intent") || searchParams.get("token") || "";
  const redirectStatus = searchParams.get("redirect_status") || "";

  console.log(
    `[PAYMENT-GATEWAY] Redirect — ref=${ref}, status=${redirectStatus}, pi=${paymentIntentId.substring(0, 15)}...`
  );

  if (!paymentIntentId) {
    console.error("[PAYMENT-GATEWAY] Missing payment_intent/token param in redirect");
    return NextResponse.json(
      { error: "Missing payment intent" },
      { status: 400 }
    );
  }

  // Try each processor to resolve the client from the payment
  const allClients = getAllClients();
  let clientId: string | null = null;

  for (const processor of getProcessorsForRedirect()) {
    const resolution = await processor.resolveClientFromPayment(
      paymentIntentId,
      allClients
    );
    if (resolution) {
      clientId = resolution.clientId;
      break;
    }
  }

  if (!clientId) {
    console.error(
      `[PAYMENT-GATEWAY] Could not resolve clientId for ${paymentIntentId}`
    );
    return NextResponse.json(
      { error: "Payment intent not found" },
      { status: 404 }
    );
  }

  const client = getClientById(clientId);
  if (!client) {
    console.error(
      `[PAYMENT-GATEWAY] Unknown clientId "${clientId}" from payment metadata`
    );
    return NextResponse.json({ error: "Unknown client" }, { status: 400 });
  }

  if (!client.redirectUrl) {
    console.error(
      `[PAYMENT-GATEWAY] [${client.id}] No redirectUrl configured`
    );
    return NextResponse.json(
      { error: "Redirect not configured" },
      { status: 500 }
    );
  }

  // Build the destination URL from the client's config
  const destUrl = new URL(client.redirectUrl);

  // Forward processor query params to the destination
  if (paymentIntentId)
    destUrl.searchParams.set("payment_intent", paymentIntentId);
  if (redirectStatus)
    destUrl.searchParams.set("redirect_status", redirectStatus);
  if (ref) destUrl.searchParams.set("ref", ref);

  console.log(`[PAYMENT-GATEWAY] [${client.id}] Redirecting — ref=${ref}`);

  return NextResponse.redirect(destUrl.toString());
}
