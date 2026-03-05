import { NextRequest, NextResponse } from 'next/server'
import { getClientById } from '../clients'

/**
 * GET /api/payment-gateway/redirect
 *
 * Multi-tenant redirect: Stripe uses this as the return_url for redirect-based
 * payment methods (Klarna, Affirm, etc.). The client's actual destination is
 * resolved from clients.json using the client ID — never exposed in the URL.
 *
 * Query params:
 *   cid              – client ID (from create-intent)
 *   ref              – opaque reference for logging
 *   payment_intent   – appended by Stripe automatically
 *   redirect_status  – appended by Stripe automatically
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('cid') || ''
  const ref = searchParams.get('ref') || ''

  // Stripe appends these params automatically
  const paymentIntent = searchParams.get('payment_intent') || ''
  const redirectStatus = searchParams.get('redirect_status') || ''

  console.log(`🔄 [PAYMENT-GATEWAY] Redirect — client=${clientId}, ref=${ref}, status=${redirectStatus}, pi=${paymentIntent.substring(0, 15)}...`)

  // Look up the client's redirect URL
  const client = clientId ? getClientById(clientId) : null
  if (!client) {
    console.error(`🔴 [PAYMENT-GATEWAY] Unknown client "${clientId}" in redirect`)
    return NextResponse.json({ error: 'Unknown client' }, { status: 400 })
  }

  if (!client.redirectUrl) {
    console.error(`🔴 [PAYMENT-GATEWAY] [${client.id}] No redirectUrl configured`)
    return NextResponse.json({ error: 'Redirect not configured' }, { status: 500 })
  }

  // Build the destination URL from the client's config
  const destUrl = new URL(client.redirectUrl)

  // Forward Stripe's query params to the destination
  if (paymentIntent) destUrl.searchParams.set('payment_intent', paymentIntent)
  if (redirectStatus) destUrl.searchParams.set('redirect_status', redirectStatus)
  if (ref) destUrl.searchParams.set('ref', ref)

  console.log(`✅ [PAYMENT-GATEWAY] [${client.id}] Redirecting — ref=${ref}`)

  return NextResponse.redirect(destUrl.toString())
}
