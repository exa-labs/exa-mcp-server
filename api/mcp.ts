import { createMcpHandler } from 'mcp-handler';
import { initializeMcpServer } from '../src/mcp-handler.js';

/**
 * Vercel Function entry point for MCP server
 * 
 * This handler is automatically deployed as a Vercel Function and provides
 * Streamable HTTP transport for the MCP protocol.
 * 
 * Supports URL query parameters (100% compatible with production mcp.exa.ai):
 * - ?exaApiKey=YOUR_KEY - Pass API key via URL
 * - ?tools=web_search_exa,get_code_context_exa - Enable specific tools
 * - ?debug=true - Enable debug logging
 * 
 * Also supports environment variables:
 * - EXA_API_KEY: Your Exa AI API key
 * - DEBUG: Enable debug logging (true/false)
 * - ENABLED_TOOLS: Comma-separated list of tools to enable
 * 
 * URL query parameters take precedence over environment variables.
 * 
 * ARCHITECTURE NOTE:
 * The mcp-handler library creates a single server instance and doesn't pass
 * the request to the initializeServer callback. To support per-request
 * configuration via URL params (like ?tools=... and ?exaApiKey=...), we
 * create a fresh handler for each request. This ensures:
 * 1. Feature parity with the production Smithery-based deployment at mcp.exa.ai
 * 2. Each request gets its own configuration (no API key leakage between users)
 * 3. Users can specify different tools and API keys per request
 */

/**
 * Extract configuration from request URL or environment variables
 * URL parameters take precedence over environment variables
 */
function getConfigFromUrl(url: string) {
  let exaApiKey = process.env.EXA_API_KEY;
  let enabledTools: string[] | undefined;
  let debug = process.env.DEBUG === 'true';

  try {
    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;

    // Support ?exaApiKey=YOUR_KEY (query param takes precedence)
    if (params.has('exaApiKey')) {
      const keyFromUrl = params.get('exaApiKey');
      if (keyFromUrl) {
        exaApiKey = keyFromUrl;
      }
    }

    // Support ?tools=tool1,tool2 (query param takes precedence)
    if (params.has('tools')) {
      const toolsParam = params.get('tools');
      if (toolsParam) {
        enabledTools = toolsParam
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0);
      }
    }

    // Support ?debug=true
    if (params.has('debug')) {
      debug = params.get('debug') === 'true';
    }
  } catch (error) {
    // URL parsing failed, will use env vars
    if (debug) {
      console.error('Failed to parse request URL:', error);
    }
  }

  // Fall back to env vars if no query params were found
  if (!enabledTools && process.env.ENABLED_TOOLS) {
    enabledTools = process.env.ENABLED_TOOLS
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  return { exaApiKey, enabledTools, debug };
}

/**
 * Create a fresh handler for the given configuration
 * We create a new handler per request to ensure each request gets its own
 * configuration (tools and API key). This prevents API key leakage between
 * different users who might pass different keys via URL.
 */
function createHandler(config: { exaApiKey?: string; enabledTools?: string[]; debug: boolean }) {
  return createMcpHandler(
    (server: any) => {
      initializeMcpServer(server, config);
    },
    {}, // Server options
    { basePath: '/api' } // Config - basePath for Vercel Functions
  );
}

/**
 * Main request handler that extracts config from URL and creates
 * a fresh handler for each request
 */
async function handleRequest(request: Request): Promise<Response> {
  // Extract configuration from the request URL
  const config = getConfigFromUrl(request.url);
  
  if (config.debug) {
    console.log(`[EXA-MCP] Request URL: ${request.url}`);
    console.log(`[EXA-MCP] Enabled tools: ${config.enabledTools?.join(', ') || 'default'}`);
    console.log(`[EXA-MCP] API key provided: ${config.exaApiKey ? 'yes' : 'no (using env var)'}`);
  }
  
  // Create a fresh handler for this request's configuration
  const handler = createHandler(config);
  
  // Delegate to the handler
  return handler(request);
}

// Export handlers for Vercel Functions
export { handleRequest as GET, handleRequest as POST, handleRequest as DELETE };

