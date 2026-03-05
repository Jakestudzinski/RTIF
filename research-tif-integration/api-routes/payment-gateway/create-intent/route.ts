import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getClientBySecret } from '../clients'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
})

const GATEWAY_REDIRECT_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.research-tif.com'

/**
 * Determine the generic Stripe description based on order amount.
 */
function getDescription(amount: number): string {
  if (amount <= 100) return 'Basic Technology Consultation'
  if (amount <= 500) return 'Mid Tier Technology Consultation'
  return 'All-In Consultation'
}

/**
 * POST /api/payment-gateway/create-intent
 *
 * Multi-tenant gateway: identifies the calling client by their shared secret
 * (x-gateway-secret header), creates a Stripe PaymentIntent with a generic
 * description, and stores the client ID in metadata for webhook/redirect routing.
 *
 * Request body:
 *   amount  – dollar amount (e.g. 149.99)
 *   ref     – opaque internal reference
 *
 * Response:
 *   clientSecret    – Stripe PaymentIntent client secret
 *   paymentIntentId – Stripe PaymentIntent ID
 *   publishableKey  – The publishable key the frontend should use
 *   returnUrl       – Redirect URL through research-tif.com (for Klarna/Affirm etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and identify the client by their shared secret
    const authHeader = request.headers.get('x-gateway-secret')
    if (!authHeader) {
      console.error('🔴 [PAYMENT-GATEWAY] Missing x-gateway-secret header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = getClientBySecret(authHeader)
    if (!client) {
      console.error('🔴 [PAYMENT-GATEWAY] Unknown client secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`🔑 [PAYMENT-GATEWAY] Authenticated client: ${client.id} (${client.label})`)

    const body = await request.json()
    const { amount, ref } = body

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const description = getDescription(amount)
    const amountInCents = Math.round(amount * 100) // Stripe requires integer cents

    console.log(`💳 [PAYMENT-GATEWAY] [${client.id}] Creating intent: $${amount.toFixed(2)} (${amountInCents} cents) — "${description}" ref=${ref || 'none'}`)

    // Create PaymentIntent with ONLY generic info — no product details, no customer PII
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      description,
      metadata: {
        ref: ref || '',
        source: 'payment-gateway',
        clientId: client.id,  // Identifies which client this payment belongs to
      },
    })

    console.log(`✅ [PAYMENT-GATEWAY] [${client.id}] Created: ${paymentIntent.id}`)

    // Build redirect URL — only contains opaque ref + client ID, never the client's domain
    const redirectUrl = `${GATEWAY_REDIRECT_BASE}/api/payment-gateway/redirect?ref=${encodeURIComponent(ref || '')}&cid=${encodeURIComponent(client.id)}`

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      returnUrl: redirectUrl,
    })
  } catch (error) {
    console.error('❌ [PAYMENT-GATEWAY] Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
