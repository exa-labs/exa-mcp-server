/**
 * OpenAI Apps SDK domain verification challenge endpoint
 *
 * Serves the verification token issued by OpenAI when submitting this MCP
 * server (mcp.exa.ai) to the ChatGPT Apps Directory / Codex Plugin Directory.
 *
 * OpenAI fetches:
 *   GET https://mcp.exa.ai/.well-known/openai-apps-challenge
 * and matches the response body against the token shown in the OpenAI Platform
 * submission UI (Apps → MCP Server → Domain verification → "Verify Domain").
 *
 * The token is supplied via the OPENAI_APPS_CHALLENGE_TOKEN environment
 * variable so it can be set / rotated without code changes. Multiple tokens
 * (e.g. during rotation) can be provided as a comma- or newline-separated
 * list — each token is served on its own line in the response body, which
 * lets OpenAI's verifier match any one of them.
 *
 * Reference: https://developers.openai.com/apps-sdk/deploy/submission
 */

function getTokens(): string[] {
  const raw = process.env.OPENAI_APPS_CHALLENGE_TOKEN || '';
  return raw
    .split(/[\n,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function GET(): Response {
  const tokens = getTokens();

  if (tokens.length === 0) {
    return new Response(
      'OPENAI_APPS_CHALLENGE_TOKEN is not configured on this deployment.\n',
      {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  return new Response(tokens.join('\n') + '\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
