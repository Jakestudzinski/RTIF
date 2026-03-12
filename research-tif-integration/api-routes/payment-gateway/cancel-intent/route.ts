import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getClientBySecret } from '../clients'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
})

/**
 * POST /api/payment-gateway/cancel-intent
 *
 * Cancels a PaymentIntent that is no longer needed (e.g. when a replacement
 * PI was created because the update-intent endpoint wasn't available).
 *
 * Request body:
 *   paymentIntentId – Stripe PaymentIntent ID to cancel
 *
 * Only cancels PIs that belong to the authenticated client (verified via metadata.clientId).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-gateway-secret')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = getClientBySecret(authHeader)
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { paymentIntentId } = body

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 })
    }

    console.log(`🚫 [PAYMENT-GATEWAY] [${client.id}] Cancel request for PI: ${paymentIntentId}`)

    // Retrieve the PI to verify ownership
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.metadata?.clientId !== client.id) {
      console.error(`🔴 [PAYMENT-GATEWAY] [${client.id}] PI ${paymentIntentId} belongs to client "${paymentIntent.metadata?.clientId}", not "${client.id}"`)
      return NextResponse.json({ error: 'PI does not belong to this client' }, { status: 403 })
    }

    // Only cancel if the PI is in a cancellable state
    const cancellableStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing']
    if (!cancellableStatuses.includes(paymentIntent.status)) {
      console.warn(`⚠️ [PAYMENT-GATEWAY] [${client.id}] PI ${paymentIntentId} status is "${paymentIntent.status}" — not cancellable`)
      return NextResponse.json({
        success: false,
        status: paymentIntent.status,
        message: `PI is in "${paymentIntent.status}" state and cannot be canceled`,
      })
    }

    const canceled = await stripe.paymentIntents.cancel(paymentIntentId)
    console.log(`✅ [PAYMENT-GATEWAY] [${client.id}] PI ${paymentIntentId} canceled (was ${paymentIntent.status})`)

    return NextResponse.json({
      success: true,
      paymentIntentId: canceled.id,
      status: canceled.status,
    })
  } catch (error) {
    console.error('❌ [PAYMENT-GATEWAY] Error canceling payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to cancel payment intent' },
      { status: 500 }
    )
  }
}
