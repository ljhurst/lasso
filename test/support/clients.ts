import type { ClientRecord, RegisteredClient } from '#src/clients/types.ts';

type Overrides = Partial<RegisteredClient> & { client_id?: string };

/** A public client record; overrides replace fields of its metadata, and `client_id` its key. */
export function makeClient(overrides: Overrides = {}): ClientRecord {
  const { client_id = 'my-app', ...rest } = overrides;
  return record(client_id, {
    client_name: 'My App',
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    redirect_uris: ['https://app.example.com/callback'],
    application_type: 'web',
    ...rest,
  });
}

export function makeConfidentialClient(overrides: Overrides = {}): ClientRecord {
  const { client_id = 'my-service', ...rest } = overrides;
  return record(client_id, {
    client_name: 'My Service',
    token_endpoint_auth_method: 'client_secret_basic',
    grant_types: ['client_credentials'],
    response_types: [],
    scope: 'victoria:read',
    ...rest,
  });
}

function record(clientId: string, metadata: RegisteredClient): ClientRecord {
  return { clientId, createdAt: '2026-01-01T00:00:00.000Z', metadata };
}
