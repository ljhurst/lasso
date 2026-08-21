import type { ClientMetadata } from 'oidc-provider';

// One client per relying party (DESIGN §7). Claude is the OAuth client in
// the MCP flow (Porto itself is a resource, not a client — see
// resources.ts), so it registers with Claude's fixed redirect URI.
export const clients: ClientMetadata[] = [
  {
    client_id: 'claude-mcp',
    client_name: 'Claude (MCP custom connector)',
    redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
  },
];
