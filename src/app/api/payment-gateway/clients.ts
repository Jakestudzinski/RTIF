export interface GatewayClient {
  id: string;
  secret: string;
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  stripeWebhookSecret?: string;
  webhookUrl: string;
  redirectUrl: string;
  label: string;
}

type ClientConfig = Omit<GatewayClient, "id">;

/**
 * Load client config from the GATEWAY_CLIENTS environment variable.
 * The value must be a JSON string matching the clients.json schema:
 *   { "clients": { "<hex-id>": { secret, webhookUrl, ... }, ... } }
 *
 * For local development you can set GATEWAY_CLIENTS in .env.local.
 * For production, set it in your hosting dashboard (e.g. Vercel).
 */
function loadClients(): Record<string, ClientConfig> {
  const raw = process.env.GATEWAY_CLIENTS;
  if (!raw) {
    console.error(
      "[GATEWAY-CLIENTS] GATEWAY_CLIENTS env var is not set — no clients will be recognised"
    );
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return (parsed.clients ?? {}) as Record<string, ClientConfig>;
  } catch (err) {
    console.error(
      "[GATEWAY-CLIENTS] Failed to parse GATEWAY_CLIENTS env var:",
      err
    );
    return {};
  }
}

const clients = loadClients();

/**
 * Look up a client by their shared secret (x-gateway-secret header).
 * Returns the full client config with its ID, or null if unrecognised.
 */
export function getClientBySecret(secret: string): GatewayClient | null {
  for (const [id, client] of Object.entries(clients)) {
    if (client.secret === secret) {
      return { id, ...client };
    }
  }
  return null;
}

/**
 * Look up a client by their ID (stored in PaymentIntent metadata.clientId).
 */
export function getClientById(clientId: string): GatewayClient | null {
  const client = clients[clientId];
  if (!client) return null;
  return { id: clientId, ...client };
}

/**
 * Return all registered clients. Used by the redirect handler to try
 * retrieving a PaymentIntent across multiple Stripe accounts.
 */
export function getAllClients(): GatewayClient[] {
  return Object.entries(clients).map(([id, client]) => ({ id, ...client }));
}
