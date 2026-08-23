import type { ClientMetadata } from 'oidc-provider';

export const clients: ClientMetadata[] = [
  {
    client_id: 'claude-mcp',
    client_name: 'Claude',
    redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
  },
  {
    client_id: 'mcp-inspector',
    client_name: 'MCP Inspector',
    redirect_uris: ['http://127.0.0.1:6274/oauth/callback'],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'native',
  },
  {
    client_id: 'porto-victoria',
    client_name: 'Porto to Victoria',
    redirect_uris: ['http://localhost:8787/callback'],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
  },
  {
    client_id: 'lasso-admin',
    client_name: 'Lasso Admin Portal',
    redirect_uris: [
      'http://localhost:8080/admin/callback',
      'https://zzspanxrc7v4tvou4acvdq36oi0yjdrz.lambda-url.us-east-1.on.aws/admin/callback',
    ],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code'],
    response_types: ['code'],
    application_type: 'web',
  },
];
