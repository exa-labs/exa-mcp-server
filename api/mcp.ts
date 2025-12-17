import { createMcpHandler } from 'mcp-handler';
import { initializeMcpServer } from '../src/mcp-handler.js';

/**
 * Vercel Function entry point for MCP server
 * 
 * This handler is automatically deployed as a Vercel Function and provides
 * Streamable HTTP transport for the MCP protocol.
 * 
 * Supports URL query parameters (100% compatible with hosted version):
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
 */

/**
 * Extract configuration from request URL or environment variables
 * URL parameters take precedence over environment variables
 */
function getConfigFromRequest(request?: Request) {
  let exaApiKey = process.env.EXA_API_KEY;
  let enabledTools: string[] | undefined;
  let debug = process.env.DEBUG === 'true';

  // Try to extract query parameters from request
  if (request?.url) {
    try {
      // Parse the full URL
      const url = new URL(request.url);
      const params = url.searchParams;

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

// Create the MCP handler with dynamic configuration
const handler = createMcpHandler(
  (server: any, request?: any) => {
    // Get configuration from request URL or environment
    const config = getConfigFromRequest(request);
    
    // Initialize the MCP server with the extracted configuration
    initializeMcpServer(server, config);
  },
  {}, // Options (empty for now)
  { basePath: '/api' } // Config - basePath for Vercel Functions
);

// Export handlers for Vercel Functions
export { handler as GET, handler as POST, handler as DELETE };

