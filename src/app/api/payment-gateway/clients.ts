import clientsConfig from "./clients.json";

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

const clients = clientsConfig.clients as Record<string, ClientConfig>;

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
