import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getClientById, getAllClients } from "../clients";

/**
 * Try to retrieve a PaymentIntent and return its metadata.clientId.
 * First tries the gateway's default Stripe account. If that fails (PI was
 * created on a client's own Stripe account), iterates clients that have
 * their own stripeSecretKey.
 */
async function resolveClientIdFromPI(
  paymentIntentId: string
): Promise<string | null> {
  // 1. Try the gateway default account
  const defaultKey = process.env.STRIPE_SECRET_KEY || "";
  if (defaultKey) {
    try {
      const stripe = new Stripe(defaultKey, {
        apiVersion: "2026-01-28.clover",
      });
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.metadata?.clientId) return pi.metadata.clientId;
    } catch {
      // PI not on default account — continue
    }
  }

  // 2. Try each client that has its own Stripe secret key
  for (const client of getAllClients()) {
    if (!client.stripeSecretKey) continue;
    try {
      const stripe = new Stripe(client.stripeSecretKey, {
        apiVersion: "2026-01-28.clover",
      });
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.metadata?.clientId) return pi.metadata.clientId;
    } catch {
      // PI not on this account — continue
    }
  }

  return null;
}

/**
 * GET /api/payment-gateway/redirect
 *
 * Multi-tenant redirect: Stripe uses this as the return_url for redirect-based
 * payment methods (Klarna, Affirm, etc.).
 *
 * No client data appears in the URL. The client is resolved by retrieving the
 * PaymentIntent (Stripe appends payment_intent= automatically) and reading
 * metadata.clientId. The client's actual destination comes from clients.json.
 *
 * Query params (all set by Stripe or the gateway — no client info):
 *   ref              - opaque reference for logging
 *   payment_intent   - appended by Stripe automatically
 *   redirect_status  - appended by Stripe automatically
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref") || "";

  // Stripe appends these params automatically
  const paymentIntentId = searchParams.get("payment_intent") || "";
  const redirectStatus = searchParams.get("redirect_status") || "";

  console.log(
    `[PAYMENT-GATEWAY] Redirect — ref=${ref}, status=${redirectStatus}, pi=${paymentIntentId.substring(0, 15)}...`
  );

  if (!paymentIntentId) {
    console.error("[PAYMENT-GATEWAY] Missing payment_intent param in redirect");
    return NextResponse.json(
      { error: "Missing payment intent" },
      { status: 400 }
    );
  }

  // Retrieve the PI to get the clientId from metadata.
  // Try the gateway's default Stripe account first. If the PI was created on
  // a client's own Stripe account, fall back to trying each client that has
  // its own stripeSecretKey.
  const clientId = await resolveClientIdFromPI(paymentIntentId);

  if (!clientId) {
    console.error(
      `[PAYMENT-GATEWAY] Could not resolve clientId for PI ${paymentIntentId}`
    );
    return NextResponse.json(
      { error: "Payment intent not found" },
      { status: 404 }
    );
  }

  const client = clientId ? getClientById(clientId) : null;
  if (!client) {
    console.error(
      `[PAYMENT-GATEWAY] Unknown clientId "${clientId}" from PI metadata`
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

  // Forward Stripe's query params to the destination
  if (paymentIntentId)
    destUrl.searchParams.set("payment_intent", paymentIntentId);
  if (redirectStatus)
    destUrl.searchParams.set("redirect_status", redirectStatus);
  if (ref) destUrl.searchParams.set("ref", ref);

  console.log(`[PAYMENT-GATEWAY] [${client.id}] Redirecting — ref=${ref}`);

  return NextResponse.redirect(destUrl.toString());
}
