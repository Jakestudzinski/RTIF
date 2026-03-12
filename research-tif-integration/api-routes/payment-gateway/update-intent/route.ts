import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getClientBySecret } from '../clients'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
})

/**
 * Determine the generic Stripe description based on order amount.
 */
function getDescription(amount: number): string {
  if (amount <= 100) return 'Basic Technology Consultation'
  if (amount <= 500) return 'Mid Tier Technology Consultation'
  return 'All-In Consultation'
}

/**
 * POST /api/payment-gateway/update-intent
 *
 * Updates an existing PaymentIntent's amount. Used when the client-side
 * total changes after the initial PaymentIntent was created (e.g. a promo
 * code is applied or removed).
 *
 * Request body:
 *   paymentIntentId – the Stripe PaymentIntent ID to update
 *   amount          – new dollar amount (e.g. 129.99)
 *
 * Response:
 *   success         – boolean
 *   paymentIntentId – the updated PaymentIntent ID
 *   amount          – the new amount in cents
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the calling client
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
    const { paymentIntentId, amount } = body

    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 })
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const amountInCents = Math.round(amount * 100)
    const description = getDescription(amount)

    console.log(`🔄 [PAYMENT-GATEWAY] [${client.id}] Updating PI ${paymentIntentId}: $${amount.toFixed(2)} (${amountInCents} cents) — "${description}"`)

    // Verify the PI belongs to this client before updating
    const existingPI = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (existingPI.metadata?.clientId !== client.id) {
      console.error(`🔴 [PAYMENT-GATEWAY] [${client.id}] PI ${paymentIntentId} does not belong to this client (metadata.clientId=${existingPI.metadata?.clientId})`)
      return NextResponse.json({ error: 'Payment intent not found for this client' }, { status: 403 })
    }

    // Update the amount and description
    await stripe.paymentIntents.update(paymentIntentId, {
      amount: amountInCents,
      description,
    })

    console.log(`✅ [PAYMENT-GATEWAY] [${client.id}] Updated PI ${paymentIntentId} to ${amountInCents} cents`)

    return NextResponse.json({
      success: true,
      paymentIntentId,
      amount: amountInCents,
    })
  } catch (error) {
    console.error('❌ [PAYMENT-GATEWAY] Error updating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to update payment intent' },
      { status: 500 }
    )
  }
}
