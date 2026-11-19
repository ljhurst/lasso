import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import Koa from 'koa';
import type Provider from 'oidc-provider';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clientServices } from '#src/clients/services.ts';
import { logEvent } from '#src/observability/events.ts';
import { revokeClientAccess } from '#src/portal/admin/revocation.ts';
import { buildAdminRouter } from '#src/portal/admin/routes.ts';
import type { FakeClientServices } from '#test/support/client-services.ts';
import { makeClient, makeConfidentialClient } from '#test/support/clients.ts';

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
  PORTAL_CLIENT_ID: 'lasso-portal',
  buildRequirePortalSession: () => async (ctx: Koa.Context, next: Koa.Next) => {
    ctx.state.user = { sub: 'admin' };
    ctx.state.isAdmin = true;
    await next();
  },
  requireAdmin: async (_ctx: Koa.Context, next: Koa.Next) => next(),
}));

const services = clientServices as FakeClientServices;
const PORTAL = makeClient({ client_id: 'lasso-portal', client_name: 'Lasso Portal' });

let server: Server;
let baseUrl: string;

beforeAll(() => {
  const app = new Koa();
  app.use(buildAdminRouter({} as Provider).routes());
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
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
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of [value].flat()) {
      body.append(key, item);
    }
  }
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'sec-fetch-site': site },
    body,
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
