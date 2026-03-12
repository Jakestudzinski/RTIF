# RTIF — Research Technology Innovation & Fulfillment

Website and multi-tenant Stripe payment gateway for **research-tif.com**, built with Next.js.

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
          ├── clients.json                  — Per-client config (secrets, URLs, Stripe keys) — GITIGNORED
          ├── clients.example.json          — Template for clients.json
          ├── clients.ts                    — Client lookup helpers (getClientBySecret, getClientById)
          ├── create-intent/route.ts        — Creates PaymentIntents with per-client Stripe keys
          ├── update-intent/route.ts        — Updates a PaymentIntent amount (per-client)
          ├── cancel-intent/route.ts        — Cancels a PaymentIntent (per-client)
          ├── redirect/route.ts             — Redirect handler for Klarna/Affirm (per-client redirectUrl)
          └── webhook/route.ts              — Receives Stripe webhooks and forwards to client's webhookUrl
```

## Payment Gateway (Multi-Tenant)

The gateway allows multiple external stores to process payments through their
own (or the gateway's default) Stripe account. Each client is registered in
`clients.json` with its own shared secret, webhook URL, redirect URL, and
optionally its own Stripe API keys.

### Per-Client Stripe Keys

Each client in `clients.json` can optionally have its own Stripe keys:
- **`stripeSecretKey`** — if present, PaymentIntents are created on the client's Stripe account
- **`stripePublishableKey`** — returned to the frontend so it confirms against the correct account
- **`stripeWebhookSecret`** — used to verify webhooks from the client's Stripe account

If a client does not have its own keys, the gateway falls back to the default
keys in `.env.local` (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`STRIPE_WEBHOOK_SECRET`).

### How It Works

1. Client sends `POST /api/payment-gateway/create-intent` with `amount` (dollars), `ref`, and `x-gateway-secret` header
2. Gateway identifies the client, resolves Stripe keys, converts dollars to cents, creates a PaymentIntent with `metadata.clientId`
3. Returns `clientSecret`, `publishableKey` (client-specific or default), `paymentIntentId`, and `returnUrl`
4. Client frontend uses `clientSecret` + `publishableKey` to confirm payment
5. For redirect methods (Klarna/Affirm), Stripe redirects to `/api/payment-gateway/redirect` — the handler retrieves the PI, reads `metadata.clientId`, and resolves the client's `redirectUrl` (no client data in the URL)
6. Stripe fires webhook to `/api/payment-gateway/webhook?cid=<client-id>` — gateway reads `metadata.clientId`, looks up the client's `webhookUrl`, and forwards the event

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payment-gateway/create-intent` | POST | Create a PaymentIntent |
| `/api/payment-gateway/update-intent` | POST | Update a PaymentIntent amount |
| `/api/payment-gateway/cancel-intent` | POST | Cancel a PaymentIntent |
| `/api/payment-gateway/redirect` | GET | Redirect handler for Klarna/Affirm |
| `/api/payment-gateway/webhook` | POST | Stripe webhook receiver |

### Description Tiers

| Order Amount   | Stripe Description                 |
|----------------|-------------------------------------|
| Up to $100     | Basic Technology Consultation       |
| $100.01 – $500 | Mid Tier Technology Consultation   |
| Above $500     | All-In Consultation                 |

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in the gateway's default Stripe keys:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=https://www.research-tif.com
```

### 2. Client Registration

Copy `clients.example.json` to `clients.json` and add each client:

```json
{
  "clients": {
    "a1b2c3": {
      "secret": "<openssl rand -hex 32>",
      "webhookUrl": "https://yourdomain.com/api/webhooks/payment-gateway",
      "redirectUrl": "https://yourdomain.com/checkout/success",
      "label": "Client A"
    },
    "d4e5f6": {
      "secret": "<openssl rand -hex 32>",
      "stripeSecretKey": "sk_live_...",
      "stripePublishableKey": "pk_live_...",
      "stripeWebhookSecret": "whsec_...",
      "webhookUrl": "https://yourdomain.com/api/webhooks/payment-gateway",
      "redirectUrl": "https://yourdomain.com/checkout/success",
      "label": "Client B (own Stripe account)"
    }
  }
}
```

- **Without Stripe keys** — uses gateway's default Stripe account
- **With Stripe keys** — payments go to that client's own Stripe account

### 3. Stripe Webhook Setup

For each client, create a webhook endpoint in the appropriate Stripe Dashboard:

**Default account (gateway):**
- **URL:** `https://www.research-tif.com/api/payment-gateway/webhook`
- **Events:** `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.refund.updated`

**Client with own Stripe account (e.g. d4e5f6):**
- **URL:** `https://www.research-tif.com/api/payment-gateway/webhook?cid=d4e5f6`
- **Events:** same as above
- Copy the signing secret into `stripeWebhookSecret` in `clients.json`

### 4. Install & Run

```bash
npm install
npm run dev
```

## Onboarding a New Client

1. Generate an opaque client ID: `python -c "import secrets; print(secrets.token_hex(3))"`
2. Generate a shared secret: `openssl rand -hex 32`
3. Add the client to `clients.json` using the hex ID as the key, with `secret`, `webhookUrl`, `redirectUrl`, `label`
4. If the client has its own Stripe account, add `stripeSecretKey`, `stripePublishableKey`, `stripeWebhookSecret`
5. Configure webhook in the appropriate Stripe Dashboard pointing to `webhook?cid=<hex-id>`
6. Give the client their `secret` to use as the `x-gateway-secret` header
7. Deploy the gateway

## Security

- Each client authenticates via its own `x-gateway-secret` shared secret (stored in `clients.json`)
- `clients.json` is gitignored — contains secrets and optionally Stripe API keys
- Stripe sees only generic descriptions — no product names, customer details, or order specifics
- Client IDs are opaque random hex strings — no business names leak into metadata, URLs, or logs
- PaymentIntent metadata stores `clientId` (opaque) and `source=payment-gateway` for routing
- Redirect URLs contain no client data — client is resolved server-side from the PaymentIntent
- Ownership enforcement: update/cancel verify `metadata.clientId` matches the authenticated client
- Webhook callbacks to each client are authenticated with that client's shared secret
- Client redirect URLs are stored server-side in `clients.json`, never exposed in URLs
