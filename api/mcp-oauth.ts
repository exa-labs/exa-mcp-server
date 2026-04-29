import { handleRequest, handleOptions } from './mcp.js';

async function handleOAuthRequest(request: Request): Promise<Response> {
  return handleRequest(request, { forceOAuth: true });
}

export {
  handleOAuthRequest as GET,
  handleOAuthRequest as POST,
  handleOAuthRequest as DELETE,
  handleOptions as OPTIONS,
};
