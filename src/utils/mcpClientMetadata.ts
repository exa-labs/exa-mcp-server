export const MCP_CLIENT_SESSION_TTL_SECONDS = 24 * 60 * 60;

const MCP_CLIENT_FIELD_MAX_LENGTH = 256;
const MCP_CLIENT_USER_AGENT_MAX_LENGTH = 512;
const MCP_CLIENT_HEADER_MAX_LENGTH = 2048;
const UNKNOWN_MCP_CLIENT_NAME = 'unknown';

export interface McpClientInfo {
  name?: string;
  title?: string;
  version?: string;
}

export interface McpClientMetadata {
  source?: string;
  sessionId?: string;
  clientInfo?: McpClientInfo;
  userAgent?: string;
}

function unknownMcpClientInfo(): McpClientInfo {
  return { name: UNKNOWN_MCP_CLIENT_NAME };
}

function sanitizeMcpClientField(value: unknown, maxLength = MCP_CLIENT_FIELD_MAX_LENGTH): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  let withoutControlCharacters = '';
  for (const character of value) {
    const codePoint = character.charCodeAt(0);
    withoutControlCharacters += codePoint <= 31 || codePoint === 127 ? ' ' : character;
  }

  const sanitized = withoutControlCharacters.trim();
  if (!sanitized) {
    return undefined;
  }

  return sanitized.slice(0, maxLength);
}

function compactMcpClientMetadata(metadata: McpClientMetadata): McpClientMetadata | undefined {
  const compact: McpClientMetadata = {};

  if (metadata.source) compact.source = metadata.source;
  if (metadata.sessionId) compact.sessionId = metadata.sessionId;
  if (metadata.clientInfo && Object.keys(metadata.clientInfo).length > 0) {
    compact.clientInfo = metadata.clientInfo;
  }
  if (metadata.userAgent) compact.userAgent = metadata.userAgent;

  return Object.keys(compact).length > 0 ? compact : undefined;
}

function isMcpClientRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeMcpClientInfo(clientInfo: unknown): McpClientInfo | undefined {
  if (!isMcpClientRecord(clientInfo)) {
    return undefined;
  }

  const compact: McpClientInfo = {};
  const name = sanitizeMcpClientField(clientInfo.name);
  const title = sanitizeMcpClientField(clientInfo.title);
  const version = sanitizeMcpClientField(clientInfo.version);

  if (name) compact.name = name;
  if (title) compact.title = title;
  if (version) compact.version = version;

  return Object.keys(compact).length > 0 ? compact : undefined;
}

export function extractInitializeClientInfo(body: string | undefined): McpClientInfo | undefined {
  if (!body) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(body);
    if (!isMcpClientRecord(parsed) || parsed.method !== 'initialize') {
      return undefined;
    }

    if (!isMcpClientRecord(parsed.params)) {
      return unknownMcpClientInfo();
    }

    return sanitizeMcpClientInfo(parsed.params.clientInfo) ?? unknownMcpClientInfo();
  } catch {
    return unknownMcpClientInfo();
  }
}

export function sanitizeMcpClientMetadata(metadata: unknown): McpClientMetadata | undefined {
  if (!isMcpClientRecord(metadata)) {
    return undefined;
  }

  return compactMcpClientMetadata({
    source: sanitizeMcpClientField(metadata.source),
    sessionId: sanitizeMcpClientField(metadata.sessionId),
    clientInfo: sanitizeMcpClientInfo(metadata.clientInfo),
    userAgent: sanitizeMcpClientField(metadata.userAgent, MCP_CLIENT_USER_AGENT_MAX_LENGTH),
  });
}

export function buildMcpClientMetadata(input: {
  source?: string;
  sessionId?: string;
  clientInfo?: McpClientInfo;
  stored?: McpClientMetadata;
  userAgent?: string;
}): McpClientMetadata {
  try {
    const metadata = compactMcpClientMetadata({
      source: sanitizeMcpClientField(input.source ?? input.stored?.source),
      sessionId: sanitizeMcpClientField(input.sessionId ?? input.stored?.sessionId),
      clientInfo: sanitizeMcpClientInfo(input.clientInfo ?? input.stored?.clientInfo),
      userAgent: sanitizeMcpClientField(input.userAgent ?? input.stored?.userAgent, MCP_CLIENT_USER_AGENT_MAX_LENGTH),
    }) ?? { clientInfo: unknownMcpClientInfo() };

    if (!metadata.clientInfo && !metadata.userAgent) {
      metadata.clientInfo = unknownMcpClientInfo();
    }

    return metadata;
  } catch {
    return { clientInfo: unknownMcpClientInfo() };
  }
}

export function serializeMcpClientMetadata(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  try {
    const serialized = JSON.stringify(value);
    if (serialized === '{}' || serialized.length > MCP_CLIENT_HEADER_MAX_LENGTH) {
      return undefined;
    }

    return serialized;
  } catch {
    return JSON.stringify({ clientInfo: unknownMcpClientInfo() });
  }
}
