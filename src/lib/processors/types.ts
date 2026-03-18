import { GatewayClient } from "@/app/api/payment-gateway/clients";

/**
 * Standardized result from creating a payment intent/order.
 * The gateway routes return this to the calling client.
 */
export interface CreateIntentResult {
  /** Stripe: PaymentIntent client_secret | PayPal: order ID */
  clientSecret: string;
  /** Stripe: PaymentIntent ID | PayPal: order ID */
  paymentIntentId: string;
  /** Stripe: publishable key | PayPal: client ID */
  publishableKey: string;
  /** Redirect URL for redirect-based payment methods (Klarna, Affirm, PayPal) */
  returnUrl: string;
  /** Which processor created this intent */
  processor: "stripe" | "paypal";
}

/**
 * Standardized result from updating a payment intent/order amount.
 */
export interface UpdateIntentResult {
  success: boolean;
  paymentIntentId: string;
  /** Updated amount in cents */
  amount: number;
}

/**
 * Standardized result from canceling a payment intent/order.
 */
export interface CancelIntentResult {
  success: boolean;
  paymentIntentId: string;
  status: string;
  message?: string;
}

/**
 * Standardized webhook verification result.
 */
export interface WebhookEvent {
  /** Normalized event type */
  type: "payment.succeeded" | "payment.failed" | "payment.refunded" | "payment.refund_updated" | "ignored" | "unknown";
  /** Original processor-specific event type (e.g. "payment_intent.succeeded") */
  rawType: string;
  /** Stripe: PaymentIntent ID | PayPal: order ID */
  paymentIntentId: string;
  /** Client ID from metadata */
  clientId: string;
  /** Opaque reference stored in metadata */
  ref: string;
  /** Processor-reported status */
  status: string;
  /** Amount in dollars */
  amount: number;
  /** Amount refunded in dollars (for refund events) */
  amountRefunded?: number;
  /** Which processor this event came from */
  processor: "stripe" | "paypal";
}

/**
 * Standardized redirect resolution result.
 */
export interface RedirectResolution {
  clientId: string;
  paymentIntentId: string;
}

/**
 * Abstract payment processor interface.
 *
 * Both StripeProcessor and PayPalProcessor implement this contract.
 * Gateway routes call these methods instead of Stripe/PayPal APIs directly.
 */
export interface PaymentProcessor {
  readonly name: "stripe" | "paypal";

  /**
   * Create a payment intent/order.
   * @param client - The authenticated gateway client
   * @param amount - Dollar amount (e.g. 149.99)
   * @param ref - Opaque internal reference (e.g. order number)
   * @param returnUrl - Base return URL for redirect flows
   */
  createIntent(
    client: GatewayClient,
    amount: number,
    ref: string,
    returnUrl: string
  ): Promise<CreateIntentResult>;

  /**
   * Update the amount on an existing payment intent/order.
   * @param client - The authenticated gateway client
   * @param paymentIntentId - Existing intent/order ID
   * @param amount - New dollar amount
   */
  updateIntent(
    client: GatewayClient,
    paymentIntentId: string,
    amount: number
  ): Promise<UpdateIntentResult>;

  /**
   * Cancel an existing payment intent/order.
   * @param client - The authenticated gateway client
   * @param paymentIntentId - Intent/order ID to cancel
   */
  cancelIntent(
    client: GatewayClient,
    paymentIntentId: string
  ): Promise<CancelIntentResult>;

  /**
   * Verify and parse a webhook event from the processor.
   * @param rawBody - Raw request body string
   * @param headers - Relevant headers (signature, etc.)
   * @param client - Optional client resolved from query params (e.g. ?cid=)
   * @returns Parsed event, or null if the event should be silently acknowledged
   */
  verifyWebhook(
    rawBody: string,
    headers: Record<string, string>,
    client: GatewayClient | null
  ): Promise<WebhookEvent | null>;

  /**
   * Resolve a client ID from a payment intent/order ID.
   * Used by the redirect handler.
   * @param paymentIntentId - The intent/order ID
   * @param allClients - All registered clients (for multi-account lookup)
   */
  resolveClientFromPayment(
    paymentIntentId: string,
    allClients: GatewayClient[]
  ): Promise<RedirectResolution | null>;
}
