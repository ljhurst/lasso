import { type ClientRecord, GrantType } from '#src/clients/types.ts';

export function makeClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    clientId: 'my-app',
    name: 'My App',
    authMethod: 'none',
    grantTypes: [GrantType.AuthorizationCode, GrantType.RefreshToken],
    redirectUris: ['https://app.example.com/callback'],
    postLogoutRedirectUris: [],
    applicationType: 'web',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeMachineClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return makeClient({
    clientId: 'my-service',
    authMethod: 'client_secret_basic',
    grantTypes: [GrantType.ClientCredentials],
    redirectUris: [],
    applicationType: undefined,
    scope: 'victoria:read',
    secretSsmParam: '/lasso/client/my-service-secret',
    ...overrides,
  });
}
