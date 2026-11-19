import { type ClientRecord, GrantType } from '#src/clients/types.ts';

export type SeedClient = Omit<ClientRecord, 'createdAt'>;

const SIGN_IN = [GrantType.AuthorizationCode, GrantType.RefreshToken];

/** The clients Lasso ran with before they were stored in a table; copied in once by the seed script. */
export const seedClients: SeedClient[] = [
  {
    clientId: 'claude-mcp',
    name: 'Claude',
    authMethod: 'none',
    grantTypes: SIGN_IN,
    redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
    postLogoutRedirectUris: [],
    applicationType: 'web',
  },
  {
    clientId: 'mcp-inspector',
    name: 'MCP Inspector',
    authMethod: 'none',
    grantTypes: SIGN_IN,
    redirectUris: ['http://127.0.0.1:6274/oauth/callback'],
    postLogoutRedirectUris: [],
    applicationType: 'native',
  },
  {
    clientId: 'porto-victoria',
    name: 'Porto to Victoria',
    authMethod: 'client_secret_basic',
    grantTypes: [GrantType.ClientCredentials],
    redirectUris: [],
    postLogoutRedirectUris: [],
    scope: 'victoria:read victoria:write',
    secretSsmParam: '/lasso/client/porto-victoria-secret',
  },
  {
    clientId: 'victoria-viewer',
    name: 'Victoria Viewer',
    authMethod: 'none',
    grantTypes: SIGN_IN,
    redirectUris: [
      'http://localhost:8000/auth/callback',
      'https://victoria-viewer.bylukehurst.com/auth/callback',
    ],
    postLogoutRedirectUris: [
      'http://localhost:8000/logged-out',
      'https://victoria-viewer.bylukehurst.com/logged-out',
    ],
    applicationType: 'web',
  },
  {
    clientId: 'lasso-portal',
    name: 'Lasso Portal',
    authMethod: 'none',
    grantTypes: [GrantType.AuthorizationCode],
    redirectUris: [
      'http://localhost:8080/portal/callback',
      'https://lasso.bylukehurst.com/portal/callback',
    ],
    postLogoutRedirectUris: [],
    applicationType: 'web',
  },
  {
    clientId: 'fife',
    name: 'Fife',
    authMethod: 'none',
    grantTypes: SIGN_IN,
    redirectUris: [
      'http://localhost:4321/auth/after-login/',
      'https://fife.bylukehurst.com/auth/after-login/',
    ],
    postLogoutRedirectUris: ['http://localhost:4321/', 'https://fife.bylukehurst.com/'],
    applicationType: 'web',
  },
  {
    clientId: 'freal',
    name: 'Freal',
    authMethod: 'none',
    grantTypes: SIGN_IN,
    redirectUris: [
      'http://localhost:4321/auth/callback',
      'https://freal.bylukehurst.com/auth/callback',
    ],
    postLogoutRedirectUris: ['http://localhost:4321/', 'https://freal.bylukehurst.com/'],
    applicationType: 'web',
  },
];
