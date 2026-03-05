import clientsConfig from './clients.json'

export interface GatewayClient {
  id: string
  secret: string
  webhookUrl: string
  redirectUrl: string
  label: string
}

const clients = clientsConfig.clients as Record<string, Omit<GatewayClient, 'id'>>

/**
 * Look up a client by their shared secret.
 * Returns the client config if found, or null if the secret doesn't match any client.
 */
export function getClientBySecret(secret: string): GatewayClient | null {
  for (const [id, client] of Object.entries(clients)) {
    if (client.secret === secret) {
      return { id, ...client }
    }
  }
  return null
}

/**
 * Look up a client by their ID (used when we store the client ID in PaymentIntent metadata).
 */
export function getClientById(clientId: string): GatewayClient | null {
  const client = clients[clientId]
  if (!client) return null
  return { id: clientId, ...client }
}
