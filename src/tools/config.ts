import { Exa } from 'exa-js';
import { serializeMcpClientMetadata } from '../utils/mcpClientMetadata.js';

// Build Exa reporting headers, appending x-exa-source if present
export function integrationHeaders(tool: string, config?: Record<string, unknown>) {
  const source = config?.exaSource;
  const mcpSessionId = config?.mcpSessionId;
  const mcpClient = serializeMcpClientMetadata(config?.mcpClient);
  const oauthAccessToken = config?.oauthAccessToken;
  const headers: Record<string, string> = {
    'x-exa-integration': typeof source === 'string' ? `${tool}:${source}` : tool,
  };

  // Forward OAuth JWT to Vulcan — Vulcan verifies independently via JWKS.
  if (typeof oauthAccessToken === 'string' && oauthAccessToken.length > 0) {
    headers['Authorization'] = `Bearer ${oauthAccessToken}`;
  }

  if (typeof mcpSessionId === 'string' && mcpSessionId.length > 0) {
    headers['x-exa-mcp-session-id'] = mcpSessionId;
  }

  if (mcpClient) {
    headers['x-exa-mcp-client'] = mcpClient;
  }

  return headers;
}

/**
 * Create an Exa SDK client for the current auth context.
 *
 * OAuth users authenticate via Authorization: Bearer (added by integrationHeaders),
 * so we must not leak the server's shared EXA_API_KEY as the x-api-key header.
 * We pass a placeholder to satisfy the SDK constructor, then strip the header.
 */
export function createExaClient(config?: Record<string, unknown>): Exa {
  if (config?.oauthAccessToken) {
    const exa = new Exa('_placeholder_');
    // Runtime value is a native Headers instance (Node 18+) with .delete().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headers: Headers = (exa as any).headers;
    if (typeof headers.delete === 'function') {
      headers.delete('x-api-key');
    }
    return exa;
  }
  return new Exa((config?.exaApiKey as string) || process.env.EXA_API_KEY || '');
}

// Configuration for API
export const API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  ENDPOINTS: {
    SEARCH: '/search',
    RESEARCH: '/research/v1',
    CONTEXT: '/context'
  },
  DEFAULT_NUM_RESULTS: 10,
  DEFAULT_MAX_CHARACTERS: 3000
} as const;
