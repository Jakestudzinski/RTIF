import { GatewayClient } from "@/app/api/payment-gateway/clients";
import { PaymentProcessor } from "./types";
import { StripeProcessor } from "./stripe";
import { PayPalProcessor } from "./paypal";

/**
 * Singleton processor instances.
 * Processors are stateless, so one instance per type is sufficient.
 */
const stripeProcessor = new StripeProcessor();
const paypalProcessor = new PayPalProcessor();

/**
 * Resolve which payment processor to use for a given client.
 *
 * Resolution order:
 * 1. If client has preferredProcessor set and has valid keys for it → use it
 * 2. If client has PayPal keys but no Stripe keys → use PayPal
 * 3. Default → Stripe (backward-compatible with all existing clients)
 *
 * Volume-based switching will be added as a layer on top of this
 * once volume tracking is implemented.
 */
export function resolveProcessor(client: GatewayClient): PaymentProcessor {
  const preferred = client.preferredProcessor || "stripe";

  if (preferred === "paypal" && hasPayPalKeys(client)) {
    console.log(
      `[PROCESSOR-FACTORY] [${client.id}] Using PayPal (preferred)`
    );
    return paypalProcessor;
  }

  if (preferred === "stripe") {
    return stripeProcessor;
  }

  // Fallback: if preferred processor isn't available, try fallback
  if (client.fallbackProcessor === "paypal" && hasPayPalKeys(client)) {
    console.log(
      `[PROCESSOR-FACTORY] [${client.id}] Using PayPal (fallback)`
    );
    return paypalProcessor;
  }

  return stripeProcessor;
}

/**
 * Resolve which processor handled a webhook event based on the request.
 *
 * Stripe webhooks have a stripe-signature header.
 * PayPal webhooks have a paypal-transmission-id header.
 */
export function resolveWebhookProcessor(
  headers: Record<string, string>
): PaymentProcessor {
  if (headers["stripe-signature"]) {
    return stripeProcessor;
  }

  if (headers["paypal-transmission-id"]) {
    return paypalProcessor;
  }

  // Default to Stripe for backward compatibility
  return stripeProcessor;
}

/**
 * Resolve which processor to use for redirect resolution.
 * Tries Stripe first (since it's the current default), then PayPal.
 */
export function getProcessorsForRedirect(): PaymentProcessor[] {
  return [stripeProcessor, paypalProcessor];
}

/**
 * Check if a client has valid PayPal keys configured.
 */
function hasPayPalKeys(client: GatewayClient): boolean {
  return !!(client.paypalClientId && client.paypalClientSecret);
}

// Re-export types for convenience
export type { PaymentProcessor } from "./types";
export type {
  CreateIntentResult,
  UpdateIntentResult,
  CancelIntentResult,
  WebhookEvent,
  RedirectResolution,
} from "./types";
