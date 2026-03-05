# Research-TIF Multi-Tenant Payment Gateway

A multi-tenant Stripe payment gateway hosted on **research-tif.com** (Next.js).
Multiple client businesses route payments through this single gateway using
research-tif.com's Stripe account with generic descriptions.

## Architecture

```
Client Business A ──┐
Client Business B ──┼──▶ research-tif.com gateway ──▶ Stripe
Client Business C ──┘         │
                              ├── create-intent (creates PaymentIntent)
                              ├── webhook (forwards payment events to correct client)
                              └── redirect (bounces Klarna/Affirm users back to correct client)
```

Each client is identified by a unique shared secret. The gateway stores the
client ID in Stripe PaymentIntent metadata so webhooks and redirects route
to the correct business automatically.

## File Structure

```
src/app/api/payment-gateway/
  ├── clients.json             — Client configuration (secrets, URLs)
  ├── clients.ts               — Client lookup utility
  ├── create-intent/route.ts   — Creates PaymentIntents
  ├── webhook/route.ts         — Receives Stripe webhooks, forwards to clients
  └── redirect/route.ts        — Handles Klarna/Affirm return redirects
```

## Adding a New Client Business

### 1. Generate a shared secret

```bash
openssl rand -hex 32
```

### 2. Add the client to `clients.json`

```json
{
  "clients": {
    "peptide-store": {
      "secret": "existing-secret-here",
      "webhookUrl": "https://studzpeptides.com/api/webhooks/payment-gateway",
      "redirectUrl": "https://studzpeptides.com/checkout/success",
      "label": "Peptide Store"
    },
    "new-business": {
      "secret": "the-generated-secret",
      "webhookUrl": "https://new-business.com/api/webhooks/payment-gateway",
      "redirectUrl": "https://new-business.com/checkout/success",
      "label": "New Business"
    }
  }
}
```

### 3. Deploy research-tif.com

No code changes needed — just update `clients.json` and redeploy.

### 4. Configure the client business

Add these env vars to the client's `.env`:

```env
PAYMENT_GATEWAY_URL=https://www.research-tif.com/api/payment-gateway
PAYMENT_GATEWAY_SECRET=<the-generated-secret>
```

### 5. Add client-side files

The client business needs these files (see peptide store as reference):

- **API route:** `src/app/api/payment/create-intent/route.ts` — calls the gateway
- **Webhook receiver:** `src/app/api/webhooks/payment-gateway/route.ts` — receives payment status callbacks
- **Payment form:** `src/components/StripeKlarnaPaymentForm.tsx` — renders Stripe Elements

## Environment Variables (research-tif.com)

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes | research-tif.com's Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | research-tif.com's Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `NEXT_PUBLIC_SITE_URL` | No | Base URL for redirect (default: `https://www.research-tif.com`) |

**Note:** Per-client secrets, webhook URLs, and redirect URLs are in `clients.json`, not env vars.

## Stripe Dashboard Setup

1. Create a webhook endpoint: `https://www.research-tif.com/api/payment-gateway/webhook`
2. Subscribe to events: `payment_intent.succeeded`, `payment_intent.payment_failed`
3. Enable desired payment methods (Card, Klarna, Affirm, Apple Pay, etc.)

## Security

- Each client has a **unique shared secret** — compromising one doesn't affect others
- Stripe sees only generic descriptions ("Basic Technology Consultation", etc.)
- No product names, customer details, or order specifics are sent to Stripe
- Client domains are **never exposed** in redirect URLs — resolved server-side from `clients.json`
- Webhook callbacks to clients are authenticated with each client's own secret
- PaymentIntent metadata contains only: `ref` (opaque), `source`, `clientId`

## Description Tiers

| Order Amount | Stripe Description |
|---|---|
| Under $100 | Basic Technology Consultation |
| $101 – $500 | Mid Tier Technology Consultation |
| Above $500 | All-In Consultation |
