import Stripe from "stripe";
import { GatewayClient } from "@/app/api/payment-gateway/clients";
import {
  PaymentProcessor,
  CreateIntentResult,
  UpdateIntentResult,
  CancelIntentResult,
  WebhookEvent,
  RedirectResolution,
} from "./types";

const STRIPE_API_VERSION = "2026-01-28.clover" as const;

/** Events we acknowledge but don't forward to clients */
const IGNORED_EVENTS = [
  "payment_intent.created",
  "charge.succeeded",
  "charge.updated",
  "charge.failed",
];

/**
 * Determine the generic Stripe description based on order amount (in dollars).
 */
function getDescription(amount: number): string {
  if (amount <= 100) return "Basic Technology Consultation";
  if (amount <= 500) return "Mid Tier Technology Consultation";
  return "All-In Consultation";
}

/**
 * Create a Stripe instance for a given client.
 * Uses client-specific keys if present, otherwise falls back to gateway defaults.
 */
function stripeForClient(client: GatewayClient | null): Stripe {
  const key =
    client?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || "";
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
}

/**
 * Resolve the publishable key for a given client.
 */
function publishableKeyForClient(client: GatewayClient): string {
  return (
    client.stripePublishableKey ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    ""
  );
}

export class StripeProcessor implements PaymentProcessor {
  readonly name = "stripe" as const;

  async createIntent(
    client: GatewayClient,
    amount: number,
    ref: string,
    returnUrl: string
  ): Promise<CreateIntentResult> {
    const stripe = stripeForClient(client);
    const amountInCents = Math.round(amount * 100);
    const description = getDescription(amount);

    // Determine payment methods based on amount
    // Klarna and Affirm require minimum $35
    // Note: apple_pay and google_pay are NOT valid payment_method_types — they
    // are surfaced automatically through "card" by Stripe Elements on compatible devices.
    const paymentMethodTypes: string[] = ["card"];
    if (amount >= 35) {
      paymentMethodTypes.push("klarna");
      paymentMethodTypes.push("affirm");
    }

    console.log(
      `[STRIPE-PROCESSOR] [${client.id}] Creating intent: $${amount.toFixed(2)} (${amountInCents} cents) — "${description}" ref=${ref || "none"}`
    );

    const createParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: "usd",
      payment_method_types: paymentMethodTypes,
      description,
      metadata: {
        ref: ref || "",
        source: "payment-gateway",
        clientId: client.id,
      },
    };

    // If the client has a connected account, route funds via transfer_data
    if (client.connectedAccountId) {
      const feeRate = client.platformFeeRate ?? 0.07;
      createParams.transfer_data = {
        destination: client.connectedAccountId,
      };
      createParams.application_fee_amount = Math.round(
        amountInCents * feeRate
      );

      console.log(
        `[STRIPE-PROCESSOR] [${client.id}] Connect transfer → ${client.connectedAccountId} (fee: ${(feeRate * 100).toFixed(1)}% = ${createParams.application_fee_amount} cents)`
      );
    }

    const paymentIntent = await stripe.paymentIntents.create(createParams);

    console.log(
      `[STRIPE-PROCESSOR] [${client.id}] Created: ${paymentIntent.id}`
    );

    const redirectUrl = `${returnUrl}?ref=${encodeURIComponent(ref || "")}`;

    return {
      clientSecret: paymentIntent.client_secret || "",
      paymentIntentId: paymentIntent.id,
      publishableKey: publishableKeyForClient(client),
      returnUrl: redirectUrl,
      processor: "stripe",
    };
  }

  async updateIntent(
    client: GatewayClient,
    paymentIntentId: string,
    amount: number
  ): Promise<UpdateIntentResult> {
    const stripe = stripeForClient(client);
    const amountInCents = Math.round(amount * 100);
    const description = getDescription(amount);

    console.log(
      `[STRIPE-PROCESSOR] [${client.id}] Updating PI ${paymentIntentId}: $${amount.toFixed(2)} (${amountInCents} cents) — "${description}"`
    );

    // Verify the PI belongs to this client before updating
    const existingPI = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (existingPI.metadata?.clientId !== client.id) {
      console.error(
        `[STRIPE-PROCESSOR] [${client.id}] PI ${paymentIntentId} does not belong to this client (metadata.clientId=${existingPI.metadata?.clientId})`
      );
      throw new Error("Payment intent not found for this client");
    }

    const updateParams: Stripe.PaymentIntentUpdateParams = {
      amount: amountInCents,
      description,
    };

    // Recalculate the platform fee if this is a connected-account client
    if (client.connectedAccountId) {
      const feeRate = client.platformFeeRate ?? 0.07;
      updateParams.application_fee_amount = Math.round(
        amountInCents * feeRate
      );

      console.log(
        `[STRIPE-PROCESSOR] [${client.id}] Connect fee updated → ${updateParams.application_fee_amount} cents (${(feeRate * 100).toFixed(1)}%)`
      );
    }

    await stripe.paymentIntents.update(paymentIntentId, updateParams);

    console.log(
      `[STRIPE-PROCESSOR] [${client.id}] Updated PI ${paymentIntentId} to ${amountInCents} cents`
    );

    return {
      success: true,
      paymentIntentId,
      amount: amountInCents,
    };
  }

  async cancelIntent(
    client: GatewayClient,
    paymentIntentId: string
  ): Promise<CancelIntentResult> {
    const stripe = stripeForClient(client);

    console.log(
      `[STRIPE-PROCESSOR] [${client.id}] Cancel request for PI: ${paymentIntentId}`
    );

    // Retrieve the PI to verify ownership
    const paymentIntent =
      await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata?.clientId !== client.id) {
      console.error(
        `[STRIPE-PROCESSOR] [${client.id}] PI ${paymentIntentId} belongs to client "${paymentIntent.metadata?.clientId}", not "${client.id}"`
      );
      throw new Error("Payment intent not found for this client");
    }

    // Only cancel if the PI is in a cancellable state
    const cancellableStatuses = [
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "processing",
    ];
    if (!cancellableStatuses.includes(paymentIntent.status)) {
      console.log(
        `[STRIPE-PROCESSOR] [${client.id}] PI ${paymentIntentId} status is "${paymentIntent.status}" — not cancellable`
      );
      return {
        success: false,
        paymentIntentId,
        status: paymentIntent.status,
        message: `PI is in "${paymentIntent.status}" state and cannot be canceled`,
      };
    }

    const canceled = await stripe.paymentIntents.cancel(paymentIntentId);

    console.log(
      `[STRIPE-PROCESSOR] [${client.id}] PI ${paymentIntentId} canceled (was ${paymentIntent.status})`
    );

    return {
      success: true,
      paymentIntentId: canceled.id,
      status: canceled.status,
    };
  }

  async verifyWebhook(
    rawBody: string,
    headers: Record<string, string>,
    client: GatewayClient | null
  ): Promise<WebhookEvent | null> {
    const stripe = stripeForClient(client);
    const signature = headers["stripe-signature"] || "";
    const webhookSecret =
      client?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || "";

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error(
        "[STRIPE-PROCESSOR] Signature verification failed:",
        err
      );
      throw new Error("Webhook signature verification failed");
    }

    console.log(
      `[STRIPE-PROCESSOR] Received event: ${event.type} (${event.id})`
    );

    // Handle payment intent events
    if (
      event.type === "payment_intent.succeeded" ||
      event.type === "payment_intent.payment_failed"
    ) {
      const pi = event.data.object as Stripe.PaymentIntent;

      if (pi.metadata?.source !== "payment-gateway") {
        console.log(
          `[STRIPE-PROCESSOR] Skipping non-gateway payment: ${pi.id}`
        );
        return null;
      }

      const normalizedType =
        event.type === "payment_intent.succeeded"
          ? "payment.succeeded"
          : "payment.failed";

      return {
        type: normalizedType,
        rawType: event.type,
        paymentIntentId: pi.id,
        clientId: pi.metadata.clientId || "",
        ref: pi.metadata.ref || "",
        status: pi.status,
        amount: pi.amount / 100,
        processor: "stripe",
      };
    }

    // Handle refund events
    if (
      event.type === "charge.refunded" ||
      event.type === "charge.refund.updated"
    ) {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

      if (!paymentIntentId) {
        console.log(
          `[STRIPE-PROCESSOR] Skipping ${event.type} — no linked PaymentIntent`
        );
        return null;
      }

      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (pi.metadata?.source !== "payment-gateway") {
        console.log(
          `[STRIPE-PROCESSOR] Skipping non-gateway refund: ${paymentIntentId}`
        );
        return null;
      }

      const normalizedType =
        event.type === "charge.refunded"
          ? "payment.refunded"
          : "payment.refund_updated";

      return {
        type: normalizedType,
        rawType: event.type,
        paymentIntentId,
        clientId: pi.metadata.clientId || "",
        ref: pi.metadata.ref || "",
        status: charge.status,
        amount: pi.amount / 100,
        amountRefunded: charge.amount_refunded / 100,
        processor: "stripe",
      };
    }

    // Ignored events — acknowledge silently
    if (IGNORED_EVENTS.includes(event.type)) {
      console.log(
        `[STRIPE-PROCESSOR] Acknowledged (no action needed): ${event.type}`
      );
      return null;
    }

    // Unknown events
    console.log(`[STRIPE-PROCESSOR] Unhandled event type: ${event.type}`);
    return null;
  }

  async resolveClientFromPayment(
    paymentIntentId: string,
    allClients: GatewayClient[]
  ): Promise<RedirectResolution | null> {
    // 1. Try the gateway default account
    const defaultKey = process.env.STRIPE_SECRET_KEY || "";
    if (defaultKey) {
      try {
        const stripe = new Stripe(defaultKey, {
          apiVersion: STRIPE_API_VERSION,
        });
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.metadata?.clientId) {
          return {
            clientId: pi.metadata.clientId,
            paymentIntentId: pi.id,
          };
        }
      } catch {
        // PI not on default account — continue
      }
    }

    // 2. Try each client that has its own Stripe secret key
    for (const client of allClients) {
      if (!client.stripeSecretKey) continue;
      try {
        const stripe = new Stripe(client.stripeSecretKey, {
          apiVersion: STRIPE_API_VERSION,
        });
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.metadata?.clientId) {
          return {
            clientId: pi.metadata.clientId,
            paymentIntentId: pi.id,
          };
        }
      } catch {
        // PI not on this account — continue
      }
    }

    return null;
  }
}
