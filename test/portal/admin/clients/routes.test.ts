import Koa from 'koa';
import type Provider from 'oidc-provider';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clientServices } from '#src/clients/services.ts';
import { logEvent } from '#src/observability/events.ts';
import { revokeClientAccess } from '#src/portal/admin/revocation.ts';
import { buildAdminRouter } from '#src/portal/admin/routes.ts';
import type { FakeClientServices } from '#test/support/client-services.ts';
import { makeClient, makeConfidentialClient } from '#test/support/clients.ts';
import { postForm, serve, type TestServer } from '#test/support/http.ts';

vi.mock('#src/clients/services.ts', async () => {
  const { fakeClientServices } = await import('#test/support/client-services.ts');
  return { clientServices: fakeClientServices() };
});

vi.mock('#src/observability/events.ts', () => ({ logEvent: vi.fn() }));

vi.mock('#src/portal/admin/revocation.ts', () => ({
  revokeAllAccess: vi.fn(),
  revokeClientAccess: vi.fn(),
  revokeGrantsRejectingScope: vi.fn(),
  revokeGrantsWithScope: vi.fn(),
}));

vi.mock('#src/portal/auth/session.ts', () => ({
  buildRequirePortalSession: () => async (ctx: Koa.Context, next: Koa.Next) => {
    ctx.state.user = { sub: 'admin' };
    ctx.state.isAdmin = true;
    await next();
  },
  requireAdmin: async (_ctx: Koa.Context, next: Koa.Next) => next(),
}));

const services = clientServices as FakeClientServices;
const PORTAL = makeClient({ client_id: 'lasso-portal', client_name: 'Lasso Portal' });

let server: TestServer;
let baseUrl: string;

beforeAll(async () => {
  const app = new Koa();
  app.use(buildAdminRouter({} as Provider).routes());
  server = await serve(app.callback());
  baseUrl = server.baseUrl;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  services.rows.clear();
  services.secrets.values.clear();
  services.rows.set(PORTAL.clientId, PORTAL);
  services.rows.set('my-app', makeClient());
  services.rows.set('my-service', makeConfidentialClient());
});

function post(path: string, fields: Record<string, string | string[]>, site = 'same-origin') {
  return postForm(`${baseUrl}${path}`, fields, {
    redirect: 'manual',
    headers: { 'sec-fetch-site': site },
  });
}

describe('client pages', () => {
  it('lists the stored clients on the dashboard', async () => {
    const html = await (await fetch(`${baseUrl}/admin`)).text();

    expect(html).toContain('href="/admin/clients/my-app"');
    expect(html).toContain('Clients (3)');
  });

  it('shows a client and sends an unknown one back to the dashboard', async () => {
    const found = await fetch(`${baseUrl}/admin/clients/my-app`);
    const missing = await fetch(`${baseUrl}/admin/clients/ghost`, { redirect: 'manual' });

    expect(await found.text()).toContain('My App');
    expect(missing.status).toBe(302);
    expect(missing.headers.get('location')).toBe('/admin');
  });

  it('shows the portal client without a settings form', async () => {
    const html = await (await fetch(`${baseUrl}/admin/clients/lasso-portal`)).text();

    expect(html).toContain('can only be changed in code');
    expect(html).not.toContain('<form class="form-grid"');
  });
});

describe('creating a client', () => {
  it('adds an app and opens its page', async () => {
    const response = await post('/admin/clients', {
      clientId: 'new-app',
      name: 'New App',
      clientType: 'public',
      applicationType: 'web',
      redirectUris: 'https://new.example.com/cb',
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/admin/clients/new-app');
    expect(services.rows.get('new-app')?.metadata.redirect_uris).toEqual([
      'https://new.example.com/cb',
    ]);
    expect(logEvent).toHaveBeenCalledWith({
      event: 'client_created',
      clientId: 'new-app',
      by: 'admin',
    });
  });

  it('adds a service and shows its secret once, uncached and unlogged', async () => {
    const response = await post('/admin/clients', {
      clientId: 'new-svc',
      name: 'New Service',
      clientType: 'confidential',
      scope: 'victoria:read',
    });
    const html = await response.text();

    const stored = services.secrets.values.get('/lasso/client/new-svc-secret') as string;
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(html).toContain(stored);
    expect(JSON.stringify(vi.mocked(logEvent).mock.calls)).not.toContain(stored);
  });

  it('explains a problem and keeps what was typed', async () => {
    const response = await post('/admin/clients', {
      clientId: 'bad',
      name: 'Typed Name',
      clientType: 'public',
      redirectUris: 'http://evil.example.com/cb',
    });
    const html = await response.text();

    expect(response.status).toBe(400);
    expect(html).toContain('not allowed');
    expect(html).toContain('Typed Name');
    expect(services.rows.has('bad')).toBe(false);
  });

  it('refuses an admin scope for a service', async () => {
    const response = await post('/admin/clients', {
      clientId: 'sneaky',
      name: 'Sneaky',
      clientType: 'confidential',
      scope: 'lasso:admin',
    });

    expect(response.status).toBe(400);
    expect(services.rows.has('sneaky')).toBe(false);
    expect(services.secrets.values.size).toBe(0);
  });

  it('refuses a request from another site', async () => {
    const response = await post(
      '/admin/clients',
      {
        clientId: 'x-app',
        name: 'X',
        clientType: 'public',
        redirectUris: 'https://x.example.com/cb',
      },
      'cross-site',
    );

    expect(response.status).toBe(403);
    expect(services.rows.has('x-app')).toBe(false);
  });
});

describe('editing a client', () => {
  it('saves new settings and says so', async () => {
    const response = await post('/admin/clients/my-app', {
      name: 'Renamed',
      redirectUris: 'https://app.example.com/other',
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Saved.');
    expect(services.rows.get('my-app')?.metadata).toMatchObject({
      client_name: 'Renamed',
      redirect_uris: ['https://app.example.com/other'],
    });
    expect(logEvent).toHaveBeenCalledWith({
      event: 'client_updated',
      clientId: 'my-app',
      by: 'admin',
    });
  });

  it('rejects a bad edit and keeps the stored client', async () => {
    const response = await post('/admin/clients/my-app', {
      name: 'Renamed',
      redirectUris: 'javascript:alert(1)',
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('value="Renamed"');
    expect(services.rows.get('my-app')?.metadata.client_name).toBe('My App');
  });

  it('never changes the portal client', async () => {
    const response = await post('/admin/clients/lasso-portal', {
      name: 'Hijacked',
      redirectUris: 'https://evil.example.com/cb',
    });

    expect(response.status).toBe(302);
    expect(services.rows.get('lasso-portal')).toEqual(PORTAL);
  });
});

describe('deleting a client', () => {
  it('asks first', async () => {
    const html = await (await fetch(`${baseUrl}/admin/clients/my-service/delete`)).text();

    expect(html).toContain('Delete this client?');
    expect(services.rows.has('my-service')).toBe(true);
  });

  it('removes the client and its secret, then ends its access', async () => {
    services.secrets.values.set('/lasso/client/my-service-secret', 's3cret');

    const response = await post('/admin/clients/my-service/delete', {});

    expect(response.status).toBe(302);
    expect(services.rows.has('my-service')).toBe(false);
    expect(services.secrets.values.size).toBe(0);
    expect(revokeClientAccess).toHaveBeenCalledWith(expect.anything(), 'my-service');
    expect(logEvent).toHaveBeenCalledWith({
      event: 'client_deleted',
      clientId: 'my-service',
      by: 'admin',
    });
  });

  it('logs the deletion before it revokes access', async () => {
    await post('/admin/clients/my-service/delete', {});

    const logged = vi.mocked(logEvent).mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY;
    const revoked = vi.mocked(revokeClientAccess).mock.invocationCallOrder[0] ?? 0;
    expect(logged).toBeLessThan(revoked);
  });

  describe('when the secret cannot be deleted', () => {
    const removeSecret = services.secrets.remove;

    afterEach(() => {
      services.secrets.remove = removeSecret;
    });

    it('keeps the client, says so, and records the failure without its message', async () => {
      services.secrets.remove = async () => {
        throw Object.assign(new Error('not authorized on arn:aws:ssm:us-east-1:1:parameter/x'), {
          name: 'AccessDeniedException',
        });
      };

      const response = await post('/admin/clients/my-service/delete', {});
      const html = await response.text();

      expect(response.status).toBe(500);
      expect(html).toContain('role="alert"');
      expect(html).toContain('Couldn&#39;t delete this client');
      expect(services.rows.has('my-service')).toBe(true);
      expect(revokeClientAccess).not.toHaveBeenCalled();
      expect(logEvent).toHaveBeenCalledWith({
        event: 'client_delete_failed',
        clientId: 'my-service',
        by: 'admin',
        error: 'AccessDeniedException',
      });
      expect(logEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: 'client_deleted' }),
      );
      expect(JSON.stringify(vi.mocked(logEvent).mock.calls)).not.toContain('arn:aws');
    });
  });

  it('never deletes the portal client', async () => {
    const response = await post('/admin/clients/lasso-portal/delete', {});

    expect(response.status).toBe(302);
    expect(services.rows.has('lasso-portal')).toBe(true);
    expect(revokeClientAccess).not.toHaveBeenCalled();
  });

  it('refuses a request from another site', async () => {
    const response = await post('/admin/clients/my-app/delete', {}, 'cross-site');

    expect(response.status).toBe(403);
    expect(services.rows.has('my-app')).toBe(true);
  });
});

describe('adding a scope to a confidential client', () => {
  const scopeOf = () => services.rows.get('my-service')?.metadata.scope;

  it('adds it, logs it, and goes back to the client', async () => {
    const response = await post('/admin/clients/my-service/scopes', { scope: 'victoria:write' });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/admin/clients/my-service');
    expect(scopeOf()).toBe('victoria:read victoria:write');
    expect(logEvent).toHaveBeenCalledWith({
      event: 'client_updated',
      clientId: 'my-service',
      by: 'admin',
    });
  });

  it.each([
    ['the admin scope', 'lasso:admin'],
    ['a scope nothing offers', 'nope:everything'],
    ['a scope it already has', 'victoria:read'],
    ['nothing', ''],
  ])('ignores %s', async (_name, scope) => {
    const response = await post('/admin/clients/my-service/scopes', { scope });

    expect(response.status).toBe(302);
    expect(scopeOf()).toBe('victoria:read');
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('never gives a public client a scope', async () => {
    await post('/admin/clients/my-app/scopes', { scope: 'victoria:read' });

    expect(services.rows.get('my-app')?.metadata.scope).toBeUndefined();
  });

  it('never changes the portal client', async () => {
    await post('/admin/clients/lasso-portal/scopes', { scope: 'victoria:read' });

    expect(services.rows.get('lasso-portal')).toEqual(PORTAL);
  });

  it('refuses a request from another site', async () => {
    const response = await post(
      '/admin/clients/my-service/scopes',
      { scope: 'victoria:write' },
      'cross-site',
    );

    expect(response.status).toBe(403);
    expect(scopeOf()).toBe('victoria:read');
  });
});

describe('removing a scope from a confidential client', () => {
  const scopeOf = () => services.rows.get('my-service')?.metadata.scope;

  beforeEach(() => {
    services.rows.set(
      'my-service',
      makeConfidentialClient({ scope: 'victoria:read victoria:write' }),
    );
  });

  it('removes it and ends the access the client already holds', async () => {
    const response = await post('/admin/clients/my-service/scopes/remove', {
      scope: 'victoria:write',
    });

    expect(response.status).toBe(302);
    expect(scopeOf()).toBe('victoria:read');
    expect(revokeClientAccess).toHaveBeenCalledWith(expect.anything(), 'my-service');
    expect(logEvent).toHaveBeenCalledWith({
      event: 'client_updated',
      clientId: 'my-service',
      by: 'admin',
    });
  });

  it('keeps the last scope', async () => {
    services.rows.set('my-service', makeConfidentialClient());

    await post('/admin/clients/my-service/scopes/remove', { scope: 'victoria:read' });

    expect(scopeOf()).toBe('victoria:read');
    expect(revokeClientAccess).not.toHaveBeenCalled();
  });

  it('ignores a scope the client does not hold', async () => {
    await post('/admin/clients/my-service/scopes/remove', { scope: 'fife:read' });

    expect(scopeOf()).toBe('victoria:read victoria:write');
    expect(revokeClientAccess).not.toHaveBeenCalled();
  });

  it('refuses a request from another site', async () => {
    const response = await post(
      '/admin/clients/my-service/scopes/remove',
      { scope: 'victoria:write' },
      'cross-site',
    );

    expect(response.status).toBe(403);
    expect(scopeOf()).toBe('victoria:read victoria:write');
    expect(revokeClientAccess).not.toHaveBeenCalled();
  });
});
