import { GatewayClient } from "@/app/api/payment-gateway/clients";
import {
  PaymentProcessor,
  CreateIntentResult,
  UpdateIntentResult,
  CancelIntentResult,
  WebhookEvent,
  RedirectResolution,
} from "./types";

/**
 * Determine the PayPal API base URL based on environment.
 * Uses sandbox for non-production, live for production.
 */
function getPayPalBaseUrl(): string {
  const env = process.env.PAYPAL_ENVIRONMENT || "sandbox";
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

/**
 * Get an OAuth2 access token from PayPal using client credentials.
 * Uses client-specific keys if present, otherwise falls back to gateway defaults.
 */
async function getAccessToken(client: GatewayClient): Promise<string> {
  const clientId =
    client.paypalClientId || process.env.PAYPAL_CLIENT_ID || "";
  const clientSecret =
    client.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    throw new Error("PayPal client credentials not configured");
  }

  const baseUrl = getPayPalBaseUrl();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `[PAYPAL-PROCESSOR] Failed to get access token: ${response.status} ${errorBody}`
    );
    throw new Error("Failed to authenticate with PayPal");
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Determine the generic description based on order amount (in dollars).
 */
function getDescription(amount: number): string {
  if (amount <= 100) return "Basic Technology Consultation";
  if (amount <= 500) return "Mid Tier Technology Consultation";
  return "All-In Consultation";
}

export class PayPalProcessor implements PaymentProcessor {
  readonly name = "paypal" as const;

  async createIntent(
    client: GatewayClient,
    amount: number,
    ref: string,
    returnUrl: string
  ): Promise<CreateIntentResult> {
    const baseUrl = getPayPalBaseUrl();
    const accessToken = await getAccessToken(client);
    const description = getDescription(amount);

    console.log(
      `[PAYPAL-PROCESSOR] [${client.id}] Creating order: $${amount.toFixed(2)} — "${description}" ref=${ref || "none"}`
    );

    // Build the PayPal order payload
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: ref || undefined,
          description,
          amount: {
            currency_code: "USD",
            value: amount.toFixed(2),
          },
          custom_id: JSON.stringify({
            source: "payment-gateway",
            clientId: client.id,
            ref: ref || "",
          }),
        },
      ],
      application_context: {
        return_url: `${returnUrl}?ref=${encodeURIComponent(ref || "")}`,
        cancel_url: `${returnUrl}?ref=${encodeURIComponent(ref || "")}&redirect_status=canceled`,
        brand_name: client.label || "Payment Gateway",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
      },
    };

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `${client.id}-${ref}-${Date.now()}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[PAYPAL-PROCESSOR] [${client.id}] Failed to create order: ${response.status} ${errorBody}`
      );
      throw new Error("Failed to create PayPal order");
    }

    const order = await response.json();

    console.log(
      `[PAYPAL-PROCESSOR] [${client.id}] Created order: ${order.id}`
    );

    // Extract the approval URL for redirect flow
    const approveLink = order.links?.find(
      (link: { rel: string; href: string }) => link.rel === "approve"
    );

    const publishableKey =
      client.paypalClientId || process.env.PAYPAL_CLIENT_ID || "";

    return {
      clientSecret: order.id,
      paymentIntentId: order.id,
      publishableKey,
      returnUrl: approveLink?.href || returnUrl,
      processor: "paypal",
    };
  }

  async updateIntent(
    client: GatewayClient,
    paymentIntentId: string,
    amount: number
  ): Promise<UpdateIntentResult> {
    const baseUrl = getPayPalBaseUrl();
    const accessToken = await getAccessToken(client);
    const description = getDescription(amount);

    console.log(
      `[PAYPAL-PROCESSOR] [${client.id}] Updating order ${paymentIntentId}: $${amount.toFixed(2)} — "${description}"`
    );

    // First retrieve the order to verify ownership
    const getResponse = await fetch(
      `${baseUrl}/v2/checkout/orders/${paymentIntentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!getResponse.ok) {
      throw new Error("PayPal order not found");
    }

    const existingOrder = await getResponse.json();

    // Verify ownership via custom_id
    let customData: { clientId?: string } = {};
    try {
      customData = JSON.parse(
        existingOrder.purchase_units?.[0]?.custom_id || "{}"
      );
    } catch {
      // invalid custom_id
    }

    if (customData.clientId !== client.id) {
      console.error(
        `[PAYPAL-PROCESSOR] [${client.id}] Order ${paymentIntentId} does not belong to this client`
      );
      throw new Error("Payment intent not found for this client");
    }

    // PayPal Orders API uses PATCH to update
    const patchPayload = [
      {
        op: "replace",
        path: "/purchase_units/@reference_id=='default'/amount",
        value: {
          currency_code: "USD",
          value: amount.toFixed(2),
        },
      },
    ];

    const patchResponse = await fetch(
      `${baseUrl}/v2/checkout/orders/${paymentIntentId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patchPayload),
      }
    );

    if (!patchResponse.ok) {
      const errorBody = await patchResponse.text();
      console.error(
        `[PAYPAL-PROCESSOR] [${client.id}] Failed to update order: ${patchResponse.status} ${errorBody}`
      );
      throw new Error("Failed to update PayPal order");
    }

    console.log(
      `[PAYPAL-PROCESSOR] [${client.id}] Updated order ${paymentIntentId} to $${amount.toFixed(2)}`
    );

    return {
      success: true,
      paymentIntentId,
      amount: Math.round(amount * 100),
    };
  }

  async cancelIntent(
    client: GatewayClient,
    paymentIntentId: string
  ): Promise<CancelIntentResult> {
    const baseUrl = getPayPalBaseUrl();
    const accessToken = await getAccessToken(client);

    console.log(
      `[PAYPAL-PROCESSOR] [${client.id}] Cancel request for order: ${paymentIntentId}`
    );

    // Retrieve the order to check its status and verify ownership
    const getResponse = await fetch(
      `${baseUrl}/v2/checkout/orders/${paymentIntentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!getResponse.ok) {
      throw new Error("PayPal order not found");
    }

    const order = await getResponse.json();

    // Verify ownership
    let customData: { clientId?: string } = {};
    try {
      customData = JSON.parse(
        order.purchase_units?.[0]?.custom_id || "{}"
      );
    } catch {
      // invalid custom_id
    }

    if (customData.clientId !== client.id) {
      throw new Error("Payment intent not found for this client");
    }

    // PayPal orders in CREATED status can be voided by simply not capturing.
    // Orders in APPROVED status can be voided. COMPLETED orders need a refund.
    if (order.status === "COMPLETED") {
      return {
        success: false,
        paymentIntentId,
        status: order.status,
        message: `Order is "${order.status}" — use refund instead of cancel`,
      };
    }

    // For CREATED or APPROVED orders, we can void by calling the void endpoint
    // or simply letting them expire. PayPal doesn't have a direct "cancel" —
    // we acknowledge the status and let the order expire.
    console.log(
      `[PAYPAL-PROCESSOR] [${client.id}] Order ${paymentIntentId} status="${order.status}" — marking as voided`
    );

    return {
      success: true,
      paymentIntentId,
      status: "voided",
    };
  }

  async verifyWebhook(
    rawBody: string,
    headers: Record<string, string>,
    client: GatewayClient | null
  ): Promise<WebhookEvent | null> {
    const baseUrl = getPayPalBaseUrl();

    // Use client-specific credentials if available
    const effectiveClient = client || ({} as GatewayClient);
    const accessToken = await getAccessToken(effectiveClient);

    // PayPal webhook verification
    const webhookId =
      client?.paypalWebhookId || process.env.PAYPAL_WEBHOOK_ID || "";

    const verifyPayload = {
      auth_algo: headers["paypal-auth-algo"] || "",
      cert_url: headers["paypal-cert-url"] || "",
      transmission_id: headers["paypal-transmission-id"] || "",
      transmission_sig: headers["paypal-transmission-sig"] || "",
      transmission_time: headers["paypal-transmission-time"] || "",
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    };

    const verifyResponse = await fetch(
      `${baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(verifyPayload),
      }
    );

    if (!verifyResponse.ok) {
      console.error(
        `[PAYPAL-PROCESSOR] Webhook verification request failed: ${verifyResponse.status}`
      );
      throw new Error("Webhook signature verification failed");
    }

    const verifyResult = await verifyResponse.json();
    if (verifyResult.verification_status !== "SUCCESS") {
      console.error(
        `[PAYPAL-PROCESSOR] Webhook verification failed: ${verifyResult.verification_status}`
      );
      throw new Error("Webhook signature verification failed");
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event_type || "";
    const resource = event.resource || {};

    console.log(
      `[PAYPAL-PROCESSOR] Received event: ${eventType} (${event.id})`
    );

    // Parse custom_id to get clientId and ref
    let customData: { source?: string; clientId?: string; ref?: string } = {};
    try {
      const customId =
        resource.purchase_units?.[0]?.custom_id ||
        resource.custom_id ||
        "";
      if (customId) {
        customData = JSON.parse(customId);
      }
    } catch {
      // invalid custom_id — try supplementary_data
    }

    // Only process gateway-originated events
    if (customData.source !== "payment-gateway") {
      console.log(
        `[PAYPAL-PROCESSOR] Skipping non-gateway event: ${event.id}`
      );
      return null;
    }

    const orderId = resource.id || "";
    const clientId = customData.clientId || "";
    const ref = customData.ref || "";

    // Normalize event types
    if (
      eventType === "CHECKOUT.ORDER.APPROVED" ||
      eventType === "PAYMENT.CAPTURE.COMPLETED"
    ) {
      const amount = parseFloat(
        resource.purchase_units?.[0]?.amount?.value ||
          resource.amount?.value ||
          "0"
      );

      return {
        type: "payment.succeeded",
        rawType: eventType,
        paymentIntentId: orderId,
        clientId,
        ref,
        status: resource.status || "COMPLETED",
        amount,
        processor: "paypal",
      };
    }

    if (
      eventType === "PAYMENT.CAPTURE.DENIED" ||
      eventType === "PAYMENT.CAPTURE.DECLINED"
    ) {
      const amount = parseFloat(
        resource.amount?.value || "0"
      );

      return {
        type: "payment.failed",
        rawType: eventType,
        paymentIntentId: orderId,
        clientId,
        ref,
        status: resource.status || "FAILED",
        amount,
        processor: "paypal",
      };
    }

    if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      const amount = parseFloat(
        resource.amount?.value || "0"
      );

      return {
        type: "payment.refunded",
        rawType: eventType,
        paymentIntentId: orderId,
        clientId,
        ref,
        status: "refunded",
        amount,
        processor: "paypal",
      };
    }

    console.log(`[PAYPAL-PROCESSOR] Unhandled event type: ${eventType}`);
    return null;
  }

  async resolveClientFromPayment(
    paymentIntentId: string,
    allClients: GatewayClient[]
  ): Promise<RedirectResolution | null> {
    // PayPal order IDs start with a specific format — try to detect
    // If it looks like a Stripe PI (starts with pi_), skip
    if (paymentIntentId.startsWith("pi_")) {
      return null;
    }

    // Try each client that has PayPal credentials
    for (const client of allClients) {
      if (!client.paypalClientId || !client.paypalClientSecret) continue;

      try {
        const accessToken = await getAccessToken(client);
        const baseUrl = getPayPalBaseUrl();

        const response = await fetch(
          `${baseUrl}/v2/checkout/orders/${paymentIntentId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) continue;

        const order = await response.json();

        // Parse custom_id to get clientId
        let customData: { clientId?: string } = {};
        try {
          customData = JSON.parse(
            order.purchase_units?.[0]?.custom_id || "{}"
          );
        } catch {
          // invalid custom_id
        }

        if (customData.clientId) {
          return {
            clientId: customData.clientId,
            paymentIntentId: order.id,
          };
        }
      } catch {
        // Order not on this client's account — continue
      }
    }

    return null;
  }
}
