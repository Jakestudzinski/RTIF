import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
})

const GATEWAY_SECRET = process.env.PAYMENT_GATEWAY_SECRET || ''
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
 * Creates a Stripe PaymentIntent on research-tif.com's Stripe account
 * with a generic description.
 *
 * Request body:
 *   amount        – dollar amount (e.g. 149.99)
 *   ref           – opaque internal reference (e.g. order number or request ID)
 *   returnUrl     – URL to redirect to after payment (for redirect-based methods)
 *
 * Response:
 *   clientSecret        – Stripe PaymentIntent client secret
 *   paymentIntentId     – Stripe PaymentIntent ID
 *   publishableKey      – The publishable key the frontend should use
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authHeader = request.headers.get('x-gateway-secret')
    if (!authHeader || authHeader !== GATEWAY_SECRET) {
      console.error('🔴 [PAYMENT-GATEWAY] Unauthorized request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { amount, ref, returnUrl } = body

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Determine payment methods based on amount
    // Klarna and Affirm require minimum $35
    const paymentMethodTypes: string[] = ['card']
    if (amount >= 35) {
      paymentMethodTypes.push('klarna')
      paymentMethodTypes.push('affirm')
    }

    const description = getDescription(amount)
    const amountInCents = Math.round(amount * 100) // Stripe requires integer cents

    console.log(`💳 [PAYMENT-GATEWAY] Creating intent: $${amount.toFixed(2)} (${amountInCents} cents) — "${description}" ref=${ref || 'none'}`)

    // Create PaymentIntent with ONLY generic info — no product details, no customer PII
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents, // Must be integer cents, NOT dollars
      currency: 'usd',
      payment_method_types: paymentMethodTypes,
      description,
      metadata: {
        ref: ref || '',           // Opaque reference — Stripe cannot derive meaning
        source: 'payment-gateway',  // Identifies this as a gateway payment
      },
    })

    console.log(`✅ [PAYMENT-GATEWAY] Created: ${paymentIntent.id}`)

    // Build a redirect URL through research-tif.com so Stripe never sees the end client domain
    const redirectUrl = returnUrl
      ? `${GATEWAY_REDIRECT_BASE}/api/payment-gateway/redirect?dest=${encodeURIComponent(returnUrl)}&ref=${encodeURIComponent(ref || '')}`
      : undefined

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
