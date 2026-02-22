# Research-TIF Stripe Payment Gateway

This directory contains the API route code to deploy on **research-tif.com** (Next.js).
The peptide store calls these endpoints to create Stripe PaymentIntents using
research-tif.com's Stripe account with generic descriptions.

## Setup

### 1. Copy files to research-tif.com project

Copy the contents of `api-routes/` into your Next.js `src/app/api/` directory:

```
src/app/api/payment-gateway/
  ├── create-intent/route.ts   — Creates PaymentIntents with generic descriptions
  └── webhook/route.ts         — Receives Stripe webhooks and notifies the peptide store
```

### 2. Environment Variables (research-tif.com)

Add these to your `.env.local` on research-tif.com:

```env
# Stripe keys (research-tif.com's own Stripe account)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Shared secret for authenticating requests
PAYMENT_GATEWAY_SECRET=<generate-a-strong-random-string>

# Peptide store callback URL for webhook notifications
PEPTIDE_STORE_WEBHOOK_URL=https://your-peptide-store.com/api/webhooks/payment-gateway
```

### 3. Environment Variables (peptide store)

Add these to the peptide store's `.env.local`:

```env
# Payment gateway configuration
PAYMENT_GATEWAY_URL=https://www.research-tif.com/api/payment-gateway
PAYMENT_GATEWAY_SECRET=<same-secret-as-above>
```

### 4. Stripe Webhook (research-tif.com)

In the Stripe Dashboard for research-tif.com's account, create a webhook endpoint:
- URL: `https://www.research-tif.com/api/payment-gateway/webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### 5. Install Stripe dependency on research-tif.com

```bash
npm install stripe
```

## Security

- All requests are authenticated with `PAYMENT_GATEWAY_SECRET`
- Stripe sees only generic descriptions ("Basic Technology Consultation", etc.)
- No product names, customer details, or order specifics are sent to Stripe
- The only metadata stored on the PaymentIntent is an opaque `ref` (internal order reference)
- Webhook callbacks to the peptide store are also authenticated with the shared secret

## Description Tiers

| Order Amount | Stripe Description |
|---|---|
| Under $100 | Basic Technology Consultation |
| $101 – $500 | Mid Tier Technology Consultation |
| Above $500 | All-In Consultation |
