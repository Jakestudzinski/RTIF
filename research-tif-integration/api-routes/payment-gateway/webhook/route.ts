import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getClientById } from '../clients'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

// Events we don't need to forward — acknowledge silently
const IGNORED_EVENTS = ['payment_intent.created', 'charge.succeeded', 'charge.updated', 'charge.failed']

/**
 * POST /api/payment-gateway/webhook
 *
 * Multi-tenant webhook: receives Stripe events, reads the clientId from
 * PaymentIntent metadata, looks up the client's webhook URL from clients.json,
 * and forwards the event to the correct client.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('🔴 [GATEWAY-WEBHOOK] Missing stripe-signature header')
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('🔴 [GATEWAY-WEBHOOK] Signature verification failed:', err)
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }

    console.log(`📩 [GATEWAY-WEBHOOK] Received event: ${event.type} (${event.id})`)

    // Only process payment_intent events we care about
    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      // Only forward events for gateway payments
      if (paymentIntent.metadata?.source !== 'payment-gateway') {
        console.log(`⏭️ [GATEWAY-WEBHOOK] Skipping non-gateway payment: ${paymentIntent.id}`)
        return NextResponse.json({ received: true })
      }

      // Look up the client from metadata
      const clientId = paymentIntent.metadata.clientId
      if (!clientId) {
        console.error(`🔴 [GATEWAY-WEBHOOK] No clientId in metadata for PI: ${paymentIntent.id}`)
        return NextResponse.json({ received: true })
      }

      const client = getClientById(clientId)
      if (!client) {
        console.error(`🔴 [GATEWAY-WEBHOOK] Unknown clientId "${clientId}" for PI: ${paymentIntent.id}`)
        return NextResponse.json({ received: true })
      }

      console.log(`🔔 [GATEWAY-WEBHOOK] [${client.id}] Forwarding ${event.type} for ${paymentIntent.id} (ref: ${paymentIntent.metadata.ref})`)

      // Forward to the client's webhook URL
      if (client.webhookUrl) {
        try {
          const callbackResponse = await fetch(client.webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-gateway-secret': client.secret,
            },
            body: JSON.stringify({
              event: event.type,
              paymentIntentId: paymentIntent.id,
              ref: paymentIntent.metadata.ref || '',
              status: paymentIntent.status,
              amount: paymentIntent.amount / 100, // Convert cents back to dollars
            }),
          })

          if (!callbackResponse.ok) {
            console.error(`🔴 [GATEWAY-WEBHOOK] [${client.id}] Callback failed: ${callbackResponse.status}`)
          } else {
            console.log(`✅ [GATEWAY-WEBHOOK] [${client.id}] Callback sent successfully`)
          }
        } catch (callbackError) {
          console.error(`🔴 [GATEWAY-WEBHOOK] [${client.id}] Failed to send callback:`, callbackError)
          // Don't fail the webhook — Stripe will retry
        }
      } else {
        console.warn(`⚠️ [GATEWAY-WEBHOOK] [${client.id}] No webhookUrl configured`)
      }

      return NextResponse.json({ received: true })
    }

    // Acknowledge events we don't need to act on
    if (IGNORED_EVENTS.includes(event.type)) {
      console.log(`⏭️ [GATEWAY-WEBHOOK] Acknowledged (no action needed): ${event.type}`)
    } else {
      console.log(`⏭️ [GATEWAY-WEBHOOK] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ [GATEWAY-WEBHOOK] Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
