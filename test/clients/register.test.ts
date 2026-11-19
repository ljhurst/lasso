import { describe, expect, it } from 'vitest';
import {
  changeClientScopes,
  type NewClientInput,
  registerClient,
  removeClient,
  updateClient,
} from '#src/clients/register.ts';
import { fakeClientServices } from '#test/support/client-services.ts';
import { makeClient, makeConfidentialClient } from '#test/support/clients.ts';

const SCOPES = ['victoria:read', 'victoria:write'];

const publicInput: NewClientInput = {
  clientId: 'my-app',
  name: 'My App',
  clientType: 'public',
  applicationType: 'web',
  redirectUris: ['https://app.example.com/callback'],
  postLogoutRedirectUris: [],
  scopes: [],
};

const confidentialInput: NewClientInput = {
  ...publicInput,
  clientId: 'my-service',
  name: 'My Service',
  clientType: 'confidential',
  redirectUris: [],
  scopes: ['victoria:read'],
};

describe('registerClient', () => {
  it('stores a public client as standard metadata and creates no secret', async () => {
    const services = fakeClientServices();

    await registerClient(services, publicInput, SCOPES, new Date('2026-02-03T04:05:06Z'));

    expect(services.rows.get('my-app')).toEqual({
      clientId: 'my-app',
      createdAt: '2026-02-03T04:05:06.000Z',
      metadata: {
        client_id: 'my-app',
        client_name: 'My App',
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        redirect_uris: ['https://app.example.com/callback'],
        application_type: 'web',
      },
    });
    expect(services.secrets.values.size).toBe(0);
  });

  it('stores post-logout uris only when given', async () => {
    const services = fakeClientServices();

    await registerClient(
      services,
      { ...publicInput, postLogoutRedirectUris: ['https://app.example.com/'] },
      SCOPES,
    );

    expect(services.rows.get('my-app')?.metadata.post_logout_redirect_uris).toEqual([
      'https://app.example.com/',
    ]);
  });

  it('gives a confidential client a generated secret, stored in SSM and returned once', async () => {
    const services = fakeClientServices();

    const result = await registerClient(services, confidentialInput, SCOPES);

    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(services.secrets.values.get('/lasso/client/my-service-secret')).toBe(result.secret);
    expect(JSON.stringify(services.rows.get('my-service'))).not.toContain(result.secret ?? '');
    expect(services.rows.get('my-service')?.metadata).toEqual({
      client_id: 'my-service',
      client_name: 'My Service',
      token_endpoint_auth_method: 'client_secret_basic',
      grant_types: ['client_credentials'],
      response_types: [],
      scope: 'victoria:read',
    });
  });

  it('ignores redirect URIs for a confidential client and scopes for a public one', async () => {
    const services = fakeClientServices();

    await registerClient(
      services,
      { ...confidentialInput, redirectUris: ['https://a.example.com/'] },
      SCOPES,
    );
    await registerClient(services, { ...publicInput, scopes: ['victoria:read'] }, SCOPES);

    expect(services.rows.get('my-service')?.metadata.redirect_uris).toBeUndefined();
    expect(services.rows.get('my-app')?.metadata.scope).toBeUndefined();
  });

  it('reports a problem and writes nothing', async () => {
    const services = fakeClientServices();

    const result = await registerClient(
      services,
      { ...publicInput, redirectUris: ['http://evil.example.com/cb'] },
      SCOPES,
    );

    expect(result).toEqual({ error: expect.stringContaining('not allowed') });
    expect(services.rows.size).toBe(0);
  });

  it('refuses a scope Lasso does not offer a confidential client', async () => {
    const services = fakeClientServices();

    const result = await registerClient(
      services,
      { ...confidentialInput, scopes: ['lasso:admin'] },
      SCOPES,
    );

    expect(result).toEqual({ error: expect.stringContaining('scopes') });
    expect(services.secrets.values.size).toBe(0);
  });

  it('refuses an id that is taken and leaves its secret alone', async () => {
    const services = fakeClientServices([makeConfidentialClient()]);
    services.secrets.values.set('/lasso/client/my-service-secret', 'original');

    const result = await registerClient(services, confidentialInput, SCOPES);

    expect(result).toEqual({ error: 'A client with that ID already exists.' });
    expect(services.secrets.values.get('/lasso/client/my-service-secret')).toBe('original');
  });

  it('removes the client again when its secret cannot be stored', async () => {
    const services = fakeClientServices();
    services.secrets.put = async () => {
      throw new Error('ssm down');
    };

    await expect(registerClient(services, confidentialInput, SCOPES)).rejects.toThrow('ssm down');
    expect(services.rows.size).toBe(0);
  });
});

describe('updateClient', () => {
  const edits = {
    name: 'Renamed',
    redirectUris: ['https://new.example.com/cb'],
    postLogoutRedirectUris: ['https://new.example.com/'],
    scopes: ['victoria:write'],
  };

  it('changes name and redirect URIs but never id, auth or grants', async () => {
    const services = fakeClientServices([makeClient()]);

    const result = await updateClient(services, 'my-app', edits, SCOPES);

    expect(result).toEqual({
      client: {
        clientId: 'my-app',
        createdAt: '2026-01-01T00:00:00.000Z',
        metadata: {
          client_id: 'my-app',
          client_name: 'Renamed',
          token_endpoint_auth_method: 'none',
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          redirect_uris: ['https://new.example.com/cb'],
          post_logout_redirect_uris: ['https://new.example.com/'],
          application_type: 'web',
        },
      },
    });
  });

  it('drops post-logout uris that were cleared, and keeps a client without refresh as it is', async () => {
    const services = fakeClientServices([
      makeClient({
        grant_types: ['authorization_code'],
        post_logout_redirect_uris: ['https://app.example.com/'],
      }),
    ]);

    await updateClient(services, 'my-app', { ...edits, postLogoutRedirectUris: [] }, SCOPES);

    const { metadata } = services.rows.get('my-app') ?? makeClient();
    expect(metadata.post_logout_redirect_uris).toBeUndefined();
    expect(metadata.grant_types).toEqual(['authorization_code']);
  });

  it('changes the scopes of a confidential client and nothing else', async () => {
    const services = fakeClientServices([makeConfidentialClient()]);

    await updateClient(services, 'my-service', edits, SCOPES);

    expect(services.rows.get('my-service')?.metadata).toEqual({
      client_id: 'my-service',
      client_name: 'Renamed',
      token_endpoint_auth_method: 'client_secret_basic',
      grant_types: ['client_credentials'],
      response_types: [],
      scope: 'victoria:write',
    });
  });

  it('keeps the stored client when an edit is invalid', async () => {
    const services = fakeClientServices([makeClient()]);

    const result = await updateClient(services, 'my-app', { ...edits, redirectUris: [] }, SCOPES);

    expect(result).toEqual({ error: expect.stringContaining('at least one') });
    expect(services.rows.get('my-app')?.metadata.client_name).toBe('My App');
  });

  it('says so when the client is gone', async () => {
    const result = await updateClient(fakeClientServices(), 'ghost', edits, SCOPES);

    expect(result).toEqual({ error: 'That client no longer exists.' });
  });
});

describe('changeClientScopes', () => {
  it('replaces the scopes and keeps everything else', async () => {
    const services = fakeClientServices([makeConfidentialClient({ client_name: 'Kept' })]);

    await changeClientScopes(services, 'my-service', ['victoria:read', 'victoria:write'], SCOPES);

    expect(services.rows.get('my-service')?.metadata).toEqual({
      client_id: 'my-service',
      client_name: 'Kept',
      token_endpoint_auth_method: 'client_secret_basic',
      grant_types: ['client_credentials'],
      response_types: [],
      scope: 'victoria:read victoria:write',
    });
  });

  it('refuses no scopes and unknown scopes, leaving the client as it was', async () => {
    const services = fakeClientServices([makeConfidentialClient()]);

    expect(await changeClientScopes(services, 'my-service', [], SCOPES)).toEqual({
      error: expect.stringContaining('scopes'),
    });
    expect(await changeClientScopes(services, 'my-service', ['lasso:admin'], SCOPES)).toEqual({
      error: expect.stringContaining('scopes'),
    });
    expect(services.rows.get('my-service')?.metadata.scope).toBe('victoria:read');
  });

  it('says so when the client is gone', async () => {
    expect(
      await changeClientScopes(fakeClientServices(), 'ghost', ['victoria:read'], SCOPES),
    ).toEqual({ error: 'That client no longer exists.' });
  });
});

describe('removeClient', () => {
  it('deletes a confidential client and its secret', async () => {
    const services = fakeClientServices([makeConfidentialClient()]);
    services.secrets.values.set('/lasso/client/my-service-secret', 's3cret');

    await removeClient(services, 'my-service');

    expect(services.rows.size).toBe(0);
    expect(services.secrets.values.size).toBe(0);
  });

  it('leaves unrelated secrets alone when deleting a public client', async () => {
    const services = fakeClientServices([makeClient()]);
    services.secrets.values.set('/lasso/client/other-secret', 'keep');

    await removeClient(services, 'my-app');

    expect(services.secrets.values.size).toBe(1);
  });

  it('does nothing for an unknown client', async () => {
    const services = fakeClientServices([makeClient()]);

    await removeClient(services, 'ghost');

    expect(services.rows.size).toBe(1);
  });
});
