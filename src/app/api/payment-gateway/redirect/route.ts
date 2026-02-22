import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/payment-gateway/redirect
 *
 * Redirect endpoint that Stripe uses as the return_url for redirect-based
 * payment methods (Klarna, Affirm, etc.). This ensures Stripe only ever
 * sees research-tif.com's domain, never the end client's domain.
 *
 * Query params:
 *   dest  - the final destination URL to redirect to (the client's order confirmation page)
 *   ref   - opaque reference for logging
 *
 * Stripe will also append its own query params (payment_intent, payment_intent_client_secret,
 * redirect_status) which we pass through to the destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dest = searchParams.get("dest");
  const ref = searchParams.get("ref") || "";

  // Stripe appends these params automatically
  const paymentIntent = searchParams.get("payment_intent") || "";
  const redirectStatus = searchParams.get("redirect_status") || "";

  console.log(
    `[PAYMENT-GATEWAY] Redirect — ref=${ref}, status=${redirectStatus}, pi=${paymentIntent.substring(0, 15)}...`
  );

  if (!dest) {
    console.error("[PAYMENT-GATEWAY] Redirect missing dest param");
    return NextResponse.json(
      { error: "Missing destination" },
      { status: 400 }
    );
  }

  // Validate the destination is a valid URL (basic security check)
  let destUrl: URL;
  try {
    destUrl = new URL(dest);
  } catch {
    console.error("[PAYMENT-GATEWAY] Redirect invalid dest URL:", dest);
    return NextResponse.json(
      { error: "Invalid destination" },
      { status: 400 }
    );
  }

  // Optional: restrict allowed redirect domains via env var
  const allowedDomains = (process.env.GATEWAY_ALLOWED_REDIRECT_DOMAINS || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  if (
    allowedDomains.length > 0 &&
    !allowedDomains.includes(destUrl.hostname)
  ) {
    console.error(
      `[PAYMENT-GATEWAY] Redirect blocked — ${destUrl.hostname} not in allowed domains: ${allowedDomains.join(", ")}`
    );
    return NextResponse.json(
      { error: "Redirect domain not allowed" },
      { status: 403 }
    );
  }

  // Forward Stripe's query params to the destination
  if (paymentIntent) destUrl.searchParams.set("payment_intent", paymentIntent);
  if (redirectStatus)
    destUrl.searchParams.set("redirect_status", redirectStatus);
  if (ref) destUrl.searchParams.set("ref", ref);

  console.log(
    `[PAYMENT-GATEWAY] Redirecting to: ${destUrl.hostname}${destUrl.pathname}`
  );

  return NextResponse.redirect(destUrl.toString());
}
