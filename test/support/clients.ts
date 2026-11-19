import type { ClientRecord, RegisteredClient } from '#src/clients/types.ts';

/** A public client record; overrides replace fields of its metadata. */
export function makeClient(overrides: Partial<RegisteredClient> = {}): ClientRecord {
  return record({
    client_id: 'my-app',
    client_name: 'My App',
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    redirect_uris: ['https://app.example.com/callback'],
    application_type: 'web',
    ...overrides,
  });
}

export function makeConfidentialClient(overrides: Partial<RegisteredClient> = {}): ClientRecord {
  return record({
    client_id: 'my-service',
    client_name: 'My Service',
    token_endpoint_auth_method: 'client_secret_basic',
    grant_types: ['client_credentials'],
    response_types: [],
    scope: 'victoria:read',
    ...overrides,
  });
}

function record(metadata: RegisteredClient): ClientRecord {
  return { clientId: metadata.client_id, createdAt: '2026-01-01T00:00:00.000Z', metadata };
}
