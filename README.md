# RTIF — Research Technology Innovation & Fulfillment

Website and Stripe payment gateway for **research-tif.com**, built with Next.js.

## Project Structure

```
src/app/
  ├── page.tsx                              — Main landing page
  ├── layout.tsx                            — Root layout with metadata
  ├── globals.css                           — Global styles (TailwindCSS)
  ├── success/page.tsx                      — Post-payment success page
  └── api/
      ├── checkout/route.ts                 — Stripe Checkout for consultation tiers
      └── payment-gateway/
          ├── create-intent/route.ts        — Creates PaymentIntents with generic descriptions
          └── webhook/route.ts              — Receives Stripe webhooks and notifies the peptide store
```

## Payment Gateway

The payment gateway routes allow an external store to process payments through
research-tif.com's Stripe account. The external store calls these endpoints to
create PaymentIntents using generic descriptions.

### How It Works

1. External store sends a `POST` to `/api/payment-gateway/create-intent` with `amount`, `ref`, and the shared secret
2. This API creates a Stripe PaymentIntent with a generic description (based on amount tier) and returns the `clientSecret`
3. The external store uses the `clientSecret` to confirm payment on the client side
4. Stripe sends a webhook to `/api/payment-gateway/webhook` on success or failure
5. The webhook route forwards the result to the external store's callback URL

### Description Tiers

| Order Amount   | Stripe Description                 |
|----------------|-------------------------------------|
| Up to $100     | Basic Technology Consultation       |
| $100.01 – $500 | Mid Tier Technology Consultation   |
| Above $500     | All-In Consultation                 |

## Setup

### 1. Environment Variables (research-tif.com)

Copy `.env.example` to `.env.local` and fill in the values:

```env
# Stripe keys (research-tif.com's own Stripe account)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Shared secret for authenticating requests from the external store
PAYMENT_GATEWAY_SECRET=<generate-a-strong-random-string>

# External store callback URL for webhook notifications
PEPTIDE_STORE_WEBHOOK_URL=https://your-store.com/api/webhooks/payment-gateway
```

### 2. Environment Variables (external store)

Add these to the external store's environment:

```env
# Payment gateway configuration
PAYMENT_GATEWAY_URL=https://www.research-tif.com/api/payment-gateway
PAYMENT_GATEWAY_SECRET=<same-secret-as-above>

# The publishable key from research-tif.com's Stripe account
NEXT_PUBLIC_STRIPE_GATEWAY_PUBLISHABLE_KEY=pk_live_...
```

### 3. Stripe Webhook

In the Stripe Dashboard for research-tif.com's account, create a webhook endpoint:
- **URL:** `https://www.research-tif.com/api/payment-gateway/webhook`
- **Events:** `payment_intent.succeeded`, `payment_intent.payment_failed`

### 4. Install & Run

```bash
npm install
npm run dev
```

## Security

- All requests from the external store are authenticated via `x-gateway-secret` header matching `PAYMENT_GATEWAY_SECRET`
- Stripe sees only generic descriptions — no product names, customer details, or order specifics
- The only metadata stored on the PaymentIntent is an opaque `ref` (internal order reference)
- Webhook callbacks to the external store are also authenticated with the shared secret
- API keys are stored in environment variables and never committed to source control
