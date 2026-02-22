import { NextRequest, NextResponse } from 'next/server'

// The client's order confirmation URL — stored server-side so it never
// appears in any URL that Stripe or the browser can see.
const CLIENT_REDIRECT_URL = process.env.GATEWAY_CLIENT_REDIRECT_URL || ''

/**
 * GET /api/payment-gateway/redirect
 *
 * Redirect endpoint that Stripe uses as the return_url for redirect-based
 * payment methods (Klarna, Affirm, etc.). This ensures Stripe only ever
 * sees research-tif.com's domain, never the end client's domain.
 *
 * The client's actual destination is resolved from a server-side env var
 * (GATEWAY_CLIENT_REDIRECT_URL) — it is NEVER passed in the URL.
 *
 * Query params (from Stripe + gateway):
 *   ref              – opaque reference for logging
 *   payment_intent   – appended by Stripe automatically
 *   redirect_status  – appended by Stripe automatically
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ref = searchParams.get('ref') || ''

  // Stripe appends these params automatically
  const paymentIntent = searchParams.get('payment_intent') || ''
  const redirectStatus = searchParams.get('redirect_status') || ''

  console.log(`🔄 [PAYMENT-GATEWAY] Redirect — ref=${ref}, status=${redirectStatus}, pi=${paymentIntent.substring(0, 15)}...`)

  if (!CLIENT_REDIRECT_URL) {
    console.error('🔴 [PAYMENT-GATEWAY] GATEWAY_CLIENT_REDIRECT_URL not configured')
    return NextResponse.json({ error: 'Redirect not configured' }, { status: 500 })
  }

  // Build the destination URL from the server-side env var
  const destUrl = new URL(CLIENT_REDIRECT_URL)

  // Forward Stripe's query params to the destination
  if (paymentIntent) destUrl.searchParams.set('payment_intent', paymentIntent)
  if (redirectStatus) destUrl.searchParams.set('redirect_status', redirectStatus)
  if (ref) destUrl.searchParams.set('ref', ref)

  console.log(`✅ [PAYMENT-GATEWAY] Redirecting — ref=${ref}`)

  return NextResponse.redirect(destUrl.toString())
}
