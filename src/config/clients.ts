import type { ClientMetadata } from 'oidc-provider';

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
