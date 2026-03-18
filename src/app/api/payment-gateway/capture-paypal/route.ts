import { NextRequest, NextResponse } from "next/server";
import { getClientBySecret } from "../clients";

/**
 * Determine the PayPal API base URL based on environment.
 */
function getPayPalBaseUrl(): string {
  const env = process.env.PAYPAL_ENVIRONMENT || "sandbox";
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

/**
 * Get an OAuth2 access token from PayPal.
 */
async function getAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
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
    throw new Error(`Failed to get PayPal access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * POST /api/payment-gateway/capture-paypal
 *
 * Captures a PayPal order after the buyer approves it.
 * Called by the client app after the PayPal JS SDK onApprove fires.
 *
 * Request body:
 *   orderID - PayPal order ID to capture
 *
 * Response:
 *   success - boolean
 *   orderID - captured order ID
 *   status  - PayPal order status after capture
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the client
    const authHeader = request.headers.get("x-gateway-secret");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getClientBySecret(authHeader);
    if (!client) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderID } = body;

    if (!orderID || typeof orderID !== "string") {
      return NextResponse.json(
        { error: "orderID is required" },
        { status: 400 }
      );
    }

    console.log(
      `[PAYPAL-CAPTURE] [${client.id}] Capturing order: ${orderID}`
    );

    // Resolve PayPal credentials
    const ppClientId =
      client.paypalClientId || process.env.PAYPAL_CLIENT_ID || "";
    const ppClientSecret =
      client.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET || "";

    if (!ppClientId || !ppClientSecret) {
      console.error(
        `[PAYPAL-CAPTURE] [${client.id}] No PayPal credentials configured`
      );
      return NextResponse.json(
        { error: "PayPal not configured for this client" },
        { status: 500 }
      );
    }

    const accessToken = await getAccessToken(ppClientId, ppClientSecret);
    const baseUrl = getPayPalBaseUrl();

    // Capture the order
    const captureResponse = await fetch(
      `${baseUrl}/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!captureResponse.ok) {
      const errorBody = await captureResponse.text();
      console.error(
        `[PAYPAL-CAPTURE] [${client.id}] Capture failed: ${captureResponse.status} ${errorBody}`
      );
      return NextResponse.json(
        { error: "Failed to capture PayPal payment" },
        { status: captureResponse.status }
      );
    }

    const captureData = await captureResponse.json();

    console.log(
      `[PAYPAL-CAPTURE] [${client.id}] Order ${orderID} captured — status: ${captureData.status}`
    );

    // Forward the success event to the client's webhook URL
    if (client.webhookUrl && captureData.status === "COMPLETED") {
      // Parse custom_id from purchase_units to get ref
      let ref = "";
      try {
        const customId =
          captureData.purchase_units?.[0]?.payments?.captures?.[0]
            ?.custom_id ||
          captureData.purchase_units?.[0]?.custom_id ||
          "";
        if (customId) {
          const customData = JSON.parse(customId);
          ref = customData.ref || "";
        }
      } catch {
        // ignore parse errors
      }

      const captureAmount = parseFloat(
        captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount
          ?.value ||
          captureData.purchase_units?.[0]?.amount?.value ||
          "0"
      );

      // Fire-and-forget webhook to client
      fetch(client.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gateway-secret": client.secret,
        },
        body: JSON.stringify({
          event: "PAYMENT.CAPTURE.COMPLETED",
          paymentIntentId: orderID,
          ref,
          status: "COMPLETED",
          amount: captureAmount,
          processor: "paypal",
        }),
      }).catch((err) => {
        console.error(
          `[PAYPAL-CAPTURE] [${client.id}] Webhook forward failed:`,
          err
        );
      });
    }

    return NextResponse.json({
      success: true,
      orderID,
      status: captureData.status,
    });
  } catch (error) {
    console.error("[PAYPAL-CAPTURE] Error:", error);
    return NextResponse.json(
      { error: "Failed to capture PayPal payment" },
      { status: 500 }
    );
  }
}
