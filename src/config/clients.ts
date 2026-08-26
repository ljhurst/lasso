import type { ClientMetadata } from 'oidc-provider';

import { getClientSecret } from '#src/config/client-secrets.ts';
import { env } from '#src/env.ts';

export async function buildClients(): Promise<ClientMetadata[]> {
  return [
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
      client_secret: await getClientSecret(env.clientSecretSsmParams.portoVictoria),
      token_endpoint_auth_method: 'client_secret_basic',
      grant_types: ['client_credentials'],
      response_types: [],
      scope: 'victoria:read victoria:write',
    },
    {
      client_id: 'lasso-portal',
      client_name: 'Lasso Portal',
      redirect_uris: [
        'http://localhost:8080/portal/callback',
        'https://zzspanxrc7v4tvou4acvdq36oi0yjdrz.lambda-url.us-east-1.on.aws/portal/callback',
      ],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
      application_type: 'web',
    },
    {
      client_id: 'fife',
      client_name: 'Fife',
      redirect_uris: [
        'http://localhost:4321/auth/after-login/',
        'https://d3de9r2gorcf05.cloudfront.net/auth/after-login/',
      ],
      post_logout_redirect_uris: [
        'http://localhost:4321/',
        'https://d3de9r2gorcf05.cloudfront.net/',
      ],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: 'web',
    },
  ];
}
