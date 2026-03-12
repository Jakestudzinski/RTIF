# Payment Gateway Integration — checkout.redpepper.com

## Architecture

```
Frontend (React CRA)          Backend (FastAPI)              Gateway (research-tif.com)         Stripe
─────────────────────         ──────────────────             ──────────────────────────         ──────
StripePaymentForm.jsx  ──►  /api/payment/create-intent  ──►  /api/payment-gateway/create-intent  ──►  PI created
                       ◄──  clientSecret + publishableKey ◄──                                    ◄──
stripe.confirmPayment()                                                                          ──►  charge
                       ──►  /api/payment/confirm-stripe-payment
                                                           /api/payment-gateway/webhook          ◄──  event
                                                       ──►  /api/webhooks/payment-gateway  ──►  order marked PAID
```

## Files Created / Modified

### Backend (`backend/`)

| File | Change | Purpose |
|------|--------|---------|
| `routers/payment_gateway.py` | **NEW** | Layer 2 bridge: `POST /api/payment/create-intent`, `PUT /api/payment/create-intent`, `POST /api/payment/confirm-stripe-payment`, `POST /api/webhooks/payment-gateway` |
| `server.py` | **MODIFIED** | Registered `payment_gateway_router` in the API router |
| `routers/orders.py` | **MODIFIED** | Made BTC payment generation conditional on `paymentMethod` field. When `"stripe"` is passed, BTC is skipped. |
| `.env` | **MODIFIED** | Added `PAYMENT_GATEWAY_URL` and `PAYMENT_GATEWAY_SECRET` placeholders |
| `tests/test_payment_gateway.py` | **NEW** | Unit + integration tests for the payment gateway router |

### Frontend (`frontend/src/`)

| File | Change | Purpose |
|------|--------|---------|
| `lib/stripe.js` | **NEW** | Stripe loader utility — caches `loadStripe()` per publishable key |
| `components/StripePaymentForm.jsx` | **NEW** | Stripe Elements wrapper: creates PI, renders PaymentElement, handles submit + redirect |
| `hooks/useStripePayment.js` | **NEW** | Convenience hook: creates order with `paymentMethod: "stripe"`, returns orderId + total |
| `pages/CheckoutWithStripe.jsx` | **NEW** | Reference checkout page demonstrating the full shipping → payment → confirmation flow |

## Environment Variables

### Backend `.env`

```env
PAYMENT_GATEWAY_URL=https://www.research-tif.com/api/payment-gateway
PAYMENT_GATEWAY_SECRET=<secret from gateway clients.json registration>
```

**No Stripe keys are needed on this app.** The gateway provides the publishable key dynamically.

## Frontend Dependencies

Install these in `frontend/`:

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

## Per-Client Stripe Keys (Gateway Architecture)

Red Pepper has its own Stripe account. The gateway on research-tif.com needs to use
**Red Pepper's Stripe keys** when processing Red Pepper payments, rather than the
gateway's default Stripe account.

### How it works

Each client in `clients.json` can optionally have its own `stripeSecretKey` and
`stripePublishableKey`. When the gateway receives a `create-intent` request, it:

1. Looks up the client by `x-gateway-secret` header
2. Checks if the client has its own Stripe keys
3. If yes → creates the PaymentIntent on **that client's Stripe account**
4. If no → falls back to the gateway's default Stripe keys

### Updated `clients.json` schema

```json
{
  "clients": {
    "peptide-store": {
      "secret": "...",
      "webhookUrl": "https://peptide-store.com/api/webhooks/payment-gateway",
      "redirectUrl": "https://peptide-store.com/checkout/success",
      "label": "Peptide Store"
    },
    "red-pepper": {
      "secret": "<openssl rand -hex 32>",
      "stripeSecretKey": "sk_live_REDPEPPER_...",
      "stripePublishableKey": "pk_live_REDPEPPER_...",
      "stripeWebhookSecret": "whsec_REDPEPPER_...",
      "webhookUrl": "https://checkout.redpepper.com/api/webhooks/payment-gateway",
      "redirectUrl": "https://checkout.redpepper.com/checkout/success",
      "label": "Red Pepper"
    }
  }
}
```

- **`peptide-store`** — no Stripe keys → uses the gateway's default Stripe account
- **`red-pepper`** — has its own keys → payments go to Red Pepper's Stripe account

### Gateway code changes needed (research-tif.com)

**1. `create-intent` route** — resolve Stripe keys per client:

```js
// In /api/payment-gateway/create-intent/route.ts
const client = resolveClient(request.headers["x-gateway-secret"]);

// Use client-specific keys if present, otherwise fall back to gateway defaults
const stripeSecretKey = client.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = client.stripePublishableKey || process.env.STRIPE_PUBLISHABLE_KEY;

const stripe = new Stripe(stripeSecretKey);

const paymentIntent = await stripe.paymentIntents.create({
  amount,
  currency: "usd",
  metadata: { ref, source: "payment-gateway", clientId: client.id },
  description: getDescriptionTier(amount),
});

return {
  clientSecret: paymentIntent.client_secret,
  paymentIntentId: paymentIntent.id,
  publishableKey: stripePublishableKey,  // client's own pk_ key
  returnUrl: `${GATEWAY_URL}/api/payment-gateway/redirect?cid=${client.id}`,
};
```

**2. `update-intent` and `cancel-intent`** — same pattern, resolve the Stripe instance per client.

**3. `webhook` route** — needs to handle webhooks from multiple Stripe accounts:

```js
// Option A: Separate webhook endpoints per client
//   Stripe dashboard → webhook URL: research-tif.com/api/payment-gateway/webhook?cid=red-pepper
//   Then verify with client.stripeWebhookSecret

// Option B: Read metadata.clientId from the event, then verify with that client's webhook secret
const event = JSON.parse(body);
const clientId = event.data?.object?.metadata?.clientId;
const client = clients[clientId];
const webhookSecret = client.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
const verified = stripe.webhooks.constructEvent(body, sig, webhookSecret);
```

**Option A is recommended** — use `?cid=red-pepper` query param on the webhook URL so
you know which Stripe webhook secret to use for signature verification *before* parsing.

### Stripe Dashboard setup (Red Pepper's account)

1. Go to Red Pepper's Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://www.research-tif.com/api/payment-gateway/webhook?cid=red-pepper`
3. Events to listen for: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
4. Copy the webhook signing secret → set as `stripeWebhookSecret` in `clients.json`

### What stays the same on Red Pepper's app

**Nothing changes on this codebase.** The Red Pepper backend still calls the same gateway
URL, sends the same `x-gateway-secret` header, and receives back a `clientSecret` +
`publishableKey`. The only difference is that `publishableKey` will now be Red Pepper's
own `pk_live_...` key instead of the gateway's default.

## Onboarding Checklist

1. **Register `red-pepper` in `clients.json` on research-tif.com** (with its own Stripe keys):
   ```json
   {
     "red-pepper": {
       "secret": "<openssl rand -hex 32>",
       "stripeSecretKey": "sk_live_REDPEPPER_...",
       "stripePublishableKey": "pk_live_REDPEPPER_...",
       "stripeWebhookSecret": "whsec_REDPEPPER_...",
       "webhookUrl": "https://checkout.redpepper.com/api/webhooks/payment-gateway",
       "redirectUrl": "https://checkout.redpepper.com/checkout/success",
       "label": "Red Pepper"
     }
   }
   ```

2. **Set the generated `secret`** in `backend/.env` as `PAYMENT_GATEWAY_SECRET`.

3. **Configure webhook** in Red Pepper's Stripe Dashboard pointing to
   `https://www.research-tif.com/api/payment-gateway/webhook?cid=red-pepper`.

4. **Update gateway code** on research-tif.com to resolve Stripe keys per client (see above).

5. **Install frontend Stripe packages** in `frontend/`:
   ```bash
   npm install @stripe/stripe-js @stripe/react-stripe-js
   ```

6. **Deploy** research-tif.com first, then checkout.redpepper.com.

## Payment Flow (End-to-End)

1. Guest fills shipping info → clicks "Proceed to Payment"
2. Frontend calls `POST /api/orders` with `paymentMethod: "stripe"` → order created (no BTC)
3. Frontend calls `POST /api/payment/create-intent` with `{ amount, orderId }` → backend calls gateway → returns `clientSecret` + `publishableKey`
4. `StripePaymentForm` renders Stripe `PaymentElement` using Red Pepper's own publishable key (returned dynamically by the gateway)
5. User enters card / selects Klarna / Affirm
6. **Card**: `stripe.confirmPayment()` succeeds inline → frontend calls `POST /api/payment/confirm-stripe-payment` → order marked PAID
7. **Redirect (Klarna/Affirm)**: browser goes to Stripe → redirected to `research-tif.com/api/payment-gateway/redirect?cid=red-pepper` → 302 to `checkout.redpepper.com/checkout/success`
8. Stripe fires webhook → gateway forwards to `POST /api/webhooks/payment-gateway` → order marked PAID (idempotent)

## Security Properties

- **No Stripe keys on this app** — gateway provides publishable key; secret key lives only on research-tif.com
- **No PII sent to Stripe** — descriptions are generic tiers ("Basic Technology Consultation", etc.)
- **Per-client shared secrets** — `x-gateway-secret` header on all gateway requests + webhook verification
- **Ownership enforcement** — gateway verifies `metadata.clientId` before update/cancel
- **Dual confirmation** — both inline confirm + webhook ensure order is marked paid

## Rollback Strategy

To revert to BTC-only payments:
1. Remove the `payment_gateway_router` import and `include_router` line from `server.py`
2. Revert the `orders.py` change (remove the `paymentMethod` routing block, restore original BTC-only code)
3. Remove the gateway env vars from `.env`
4. No database migration needed — orders with `paymentMethod: "stripe"` are just documents
