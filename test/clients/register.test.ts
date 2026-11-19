import { describe, expect, it } from 'vitest';
import {
  type NewClientInput,
  registerClient,
  removeClient,
  updateClient,
} from '#src/clients/register.ts';
import { makeClient, makeMachineClient } from '#test/support/clients.ts';
import { fakeClientServices } from '#test/support/client-services.ts';

const SCOPES = ['victoria:read', 'victoria:write'];

const appInput: NewClientInput = {
  clientId: 'my-app',
  name: 'My App',
  kind: 'app',
  applicationType: 'web',
  redirectUris: ['https://app.example.com/callback'],
  postLogoutRedirectUris: [],
  scopes: [],
};

const serviceInput: NewClientInput = {
  ...appInput,
  clientId: 'my-service',
  name: 'My Service',
  kind: 'service',
  redirectUris: [],
  scopes: ['victoria:read'],
};

describe('registerClient', () => {
  it('stores a public sign-in client and creates no secret', async () => {
    const services = fakeClientServices();

    const result = await registerClient(services, appInput, SCOPES);

    expect(result).toMatchObject({
      client: {
        clientId: 'my-app',
        authMethod: 'none',
        grantTypes: ['authorization_code', 'refresh_token'],
        redirectUris: ['https://app.example.com/callback'],
      },
    });
    expect(services.rows.get('my-app')?.secretSsmParam).toBeUndefined();
    expect(services.secrets.values.size).toBe(0);
  });

  it('gives a service client a generated secret, stored in SSM and returned once', async () => {
    const services = fakeClientServices();

    const result = await registerClient(services, serviceInput, SCOPES);

    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(services.secrets.values.get('/lasso/client/my-service-secret')).toBe(result.secret);
    expect(JSON.stringify(services.rows.get('my-service'))).not.toContain(result.secret ?? '');
    expect(services.rows.get('my-service')).toMatchObject({
      authMethod: 'client_secret_basic',
      grantTypes: ['client_credentials'],
      scope: 'victoria:read',
      redirectUris: [],
    });
  });

  it('ignores redirect URIs for a service and scopes for an app', async () => {
    const services = fakeClientServices();

    await registerClient(
      services,
      { ...serviceInput, redirectUris: ['https://a.example.com/'] },
      SCOPES,
    );
    await registerClient(services, { ...appInput, scopes: ['victoria:read'] }, SCOPES);

    expect(services.rows.get('my-service')?.redirectUris).toEqual([]);
    expect(services.rows.get('my-app')?.scope).toBeUndefined();
  });

  it('reports a problem and writes nothing', async () => {
    const services = fakeClientServices();

    const result = await registerClient(
      services,
      { ...appInput, redirectUris: ['http://evil.example.com/cb'] },
      SCOPES,
    );

    expect(result).toEqual({ error: expect.stringContaining('not allowed') });
    expect(services.rows.size).toBe(0);
  });

  it('refuses an unknown scope for a service', async () => {
    const services = fakeClientServices();

    const result = await registerClient(
      services,
      { ...serviceInput, scopes: ['lasso:admin'] },
      SCOPES,
    );

    expect(result).toEqual({ error: expect.stringContaining('scopes') });
    expect(services.secrets.values.size).toBe(0);
  });

  it('refuses an id that is taken and leaves its secret alone', async () => {
    const services = fakeClientServices([makeMachineClient({ clientId: 'my-service' })]);
    services.secrets.values.set('/lasso/client/my-service-secret', 'original');

    const result = await registerClient(services, serviceInput, SCOPES);

    expect(result).toEqual({ error: 'A client with that ID already exists.' });
    expect(services.secrets.values.get('/lasso/client/my-service-secret')).toBe('original');
  });

  it('removes the client again when its secret cannot be stored', async () => {
    const services = fakeClientServices();
    services.secrets.put = async () => {
      throw new Error('ssm down');
    };

    await expect(registerClient(services, serviceInput, SCOPES)).rejects.toThrow('ssm down');
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

    expect(result).toMatchObject({
      client: {
        clientId: 'my-app',
        name: 'Renamed',
        redirectUris: ['https://new.example.com/cb'],
        authMethod: 'none',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(services.rows.get('my-app')?.scope).toBeUndefined();
  });

  it('changes the scopes of a service and keeps its secret parameter', async () => {
    const services = fakeClientServices([makeMachineClient()]);

    await updateClient(services, 'my-service', { ...edits, redirectUris: [] }, SCOPES);

    expect(services.rows.get('my-service')).toMatchObject({
      scope: 'victoria:write',
      secretSsmParam: '/lasso/client/my-service-secret',
    });
  });

  it('keeps the stored client when an edit is invalid', async () => {
    const services = fakeClientServices([makeClient()]);

    const result = await updateClient(services, 'my-app', { ...edits, redirectUris: [] }, SCOPES);

    expect(result).toEqual({ error: expect.stringContaining('at least one') });
    expect(services.rows.get('my-app')?.name).toBe('My App');
  });

  it('says so when the client is gone', async () => {
    const result = await updateClient(fakeClientServices(), 'ghost', edits, SCOPES);

    expect(result).toEqual({ error: 'That client no longer exists.' });
  });
});

describe('removeClient', () => {
  it('deletes the client and its secret', async () => {
    const services = fakeClientServices([makeMachineClient()]);
    services.secrets.values.set('/lasso/client/my-service-secret', 's3cret');

    await removeClient(services, 'my-service');

    expect(services.rows.size).toBe(0);
    expect(services.secrets.values.size).toBe(0);
  });

  it('does nothing for an unknown client', async () => {
    const services = fakeClientServices([makeClient()]);

    await removeClient(services, 'ghost');

    expect(services.rows.size).toBe(1);
  });
});
