import Koa from 'koa';
import type Provider from 'oidc-provider';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { logEvent } from '#src/observability/events.ts';
import { revokeResourceAccess, revokeResourceScopes } from '#src/portal/admin/revocation.ts';
import { buildAdminRouter } from '#src/portal/admin/routes.ts';
import { resourcesChanged } from '#src/resources/changes.ts';
import { resourceId } from '#src/resources/id.ts';
import { fake } from '#test/support/resource-fake.ts';
import { postForm, serve, type TestServer } from '#test/support/http.ts';
import { makeResource } from '#test/support/resources.ts';

vi.mock('#src/portal/admin/resources/services.ts', async () => {
  const { fake } = await import('#test/support/resource-fake.ts');
  return { resourceServices: fake };
});

vi.mock('#src/resources/services.ts', async () => {
  const { fake } = await import('#test/support/resource-fake.ts');
  const { createResourceRegistry } = await import('#src/resources/registry.ts');
  const { builtInResources } = await import('#src/resources/built-in.ts');
  return {
    resourceStore: fake.store,
    resourceRegistry: createResourceRegistry(fake.store, builtInResources),
  };
});

vi.mock('#src/clients/services.ts', async () => {
  const { fakeClientServices } = await import('#test/support/client-services.ts');
  return { clientServices: fakeClientServices() };
});

vi.mock('#src/resources/changes.ts', () => ({
  resourcesChanged: vi.fn(),
  onResourcesChanged: vi.fn(),
}));

vi.mock('#src/observability/events.ts', () => ({ logEvent: vi.fn() }));

vi.mock('#src/portal/admin/revocation.ts', () => ({
  revokeAllAccess: vi.fn(),
  revokeClientAccess: vi.fn(),
  revokeGrantsRejectingScope: vi.fn(),
  revokeGrantsWithScope: vi.fn(),
  revokeResourceAccess: vi.fn(),
  revokeResourceScopes: vi.fn(),
}));

vi.mock('#src/portal/auth/session.ts', () => ({
  buildRequirePortalSession: () => async (ctx: Koa.Context, next: Koa.Next) => {
    ctx.state.user = { sub: 'admin' };
    ctx.state.isAdmin = true;
    await next();
  },
  requireAdmin: async (_ctx: Koa.Context, next: Koa.Next) => next(),
}));

const EXAMPLE = 'https://api.example.com/';
const ID = resourceId(EXAMPLE);

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
  fake.rows.clear();
  fake.held.clear();
  fake.rows.set(EXAMPLE, makeResource({}, { type: 'mcp', url: 'https://api.example.com/mcp' }));
});

function post(path: string, fields: Record<string, string | string[]>, site = 'same-origin') {
  return postForm(`${baseUrl}${path}`, fields, {
    redirect: 'manual',
    headers: { 'sec-fetch-site': site },
  });
}

describe('resource pages', () => {
  it('lists the resources on the dashboard, each linking to its page', async () => {
    const html = await (await fetch(`${baseUrl}/admin`)).text();

    expect(html).toContain(`href="/admin/resources/${ID}"`);
    expect(html).toContain('href="/admin/resources/new"');
    expect(html).toContain('Lasso Admin');
  });

  it('shows a stored resource with its settings form', async () => {
    const html = await (await fetch(`${baseUrl}/admin/resources/${ID}`)).text();

    expect(html).toContain('Example API');
    expect(html).toContain('<form class="form-grid"');
  });

  it("shows Lasso's own resource without a form", async () => {
    const html = await (
      await fetch(`${baseUrl}/admin/resources/${resourceId('https://lasso.example.com')}`)
    ).text();

    expect(html).toContain('can only be changed in code');
    expect(html).not.toContain('<form class="form-grid"');
  });

  it.each([resourceId('https://nope.example.com/'), 'not!valid', '%2F'])(
    'sends an unknown or malformed id %j back to the dashboard',
    async (id) => {
      const response = await fetch(`${baseUrl}/admin/resources/${id}`, { redirect: 'manual' });

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/admin');
    },
  );
});

describe('adding a resource', () => {
  const fields = {
    resource: 'https://new.example.com/',
    name: 'New API',
    scopes: 'new:read\nnew:write',
    appType: 'web',
    appUrl: 'https://new.example.com/app',
  };

  it('stores it, logs it, applies it at once and opens its page', async () => {
    const response = await post('/admin/resources', fields);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      `/admin/resources/${resourceId('https://new.example.com/')}`,
    );
    expect(fake.rows.get('https://new.example.com/')?.metadata.scopes_supported).toEqual([
      'new:read',
      'new:write',
    ]);
    expect(logEvent).toHaveBeenCalledWith({
      event: 'resource_created',
      resource: 'https://new.example.com/',
      by: 'admin',
    });
    expect(resourcesChanged).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the admin scope', { scopes: 'lasso:admin' }],
    ['no scopes', { scopes: '' }],
    ['a malformed scope', { scopes: 'Not A Scope' }],
    ['an insecure indicator', { resource: 'http://new.example.com/' }],
    ["Lasso's own indicator", { resource: 'https://lasso.example.com' }],
    ['an indicator that is taken', { resource: EXAMPLE }],
  ])('refuses %s, keeps what was typed and changes nothing', async (_name, change) => {
    const before = fake.rows.size;

    const response = await post('/admin/resources', { ...fields, ...change });
    const html = await response.text();

    expect(response.status).toBe(400);
    expect(html).toContain('role="alert"');
    expect(html).toContain('value="New API"');
    expect(fake.rows.size).toBe(before);
    expect(logEvent).not.toHaveBeenCalled();
    expect(resourcesChanged).not.toHaveBeenCalled();
  });

  it('refuses a request from another site', async () => {
    const response = await post('/admin/resources', fields, 'cross-site');

    expect(response.status).toBe(403);
    expect(fake.rows.has('https://new.example.com/')).toBe(false);
  });
});

describe('editing a resource', () => {
  const edit = (scopes: string) => ({ name: 'Renamed', scopes, appType: '', appUrl: '' });

  it('saves, logs and applies the change at once, without revoking when nothing was taken away', async () => {
    const response = await post(
      `/admin/resources/${ID}`,
      edit('example:read\nexample:write\nexample:admin'),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Saved.');
    expect(fake.rows.get(EXAMPLE)?.metadata.resource_name).toBe('Renamed');
    expect(logEvent).toHaveBeenCalledWith({
      event: 'resource_updated',
      resource: EXAMPLE,
      by: 'admin',
    });
    expect(resourcesChanged).toHaveBeenCalledTimes(1);
    expect(revokeResourceScopes).not.toHaveBeenCalled();
  });

  it('ends the grants that held a scope that was taken away', async () => {
    await post(`/admin/resources/${ID}`, edit('example:read'));

    expect(revokeResourceScopes).toHaveBeenCalledWith(expect.anything(), EXAMPLE, [
      'example:write',
    ]);
  });

  it('refuses to take away a scope a client holds', async () => {
    fake.held.add('example:write');

    const response = await post(`/admin/resources/${ID}`, edit('example:read'));
    const html = await response.text();

    expect(response.status).toBe(400);
    expect(html).toContain('example:write');
    expect(html).toContain('value="Renamed"');
    expect(fake.rows.get(EXAMPLE)?.metadata.scopes_supported).toEqual([
      'example:read',
      'example:write',
    ]);
    expect(revokeResourceScopes).not.toHaveBeenCalled();
    expect(resourcesChanged).not.toHaveBeenCalled();
  });

  it('never changes a built-in resource', async () => {
    const response = await post(
      `/admin/resources/${resourceId('https://lasso.example.com')}`,
      edit('x:read'),
    );

    expect(response.status).toBe(302);
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('refuses a request from another site', async () => {
    const response = await post(`/admin/resources/${ID}`, edit('example:read'), 'cross-site');

    expect(response.status).toBe(403);
    expect(fake.rows.get(EXAMPLE)?.metadata.resource_name).toBe('Example API');
  });
});

describe('deleting a resource', () => {
  it('asks first', async () => {
    const html = await (await fetch(`${baseUrl}/admin/resources/${ID}/delete`)).text();

    expect(html).toContain('Delete this resource?');
    expect(fake.rows.has(EXAMPLE)).toBe(true);
  });

  it('removes it, logs it, then ends the access that reached it', async () => {
    const response = await post(`/admin/resources/${ID}/delete`, {});

    expect(response.status).toBe(302);
    expect(fake.rows.has(EXAMPLE)).toBe(false);
    expect(revokeResourceAccess).toHaveBeenCalledWith(expect.anything(), EXAMPLE);
    expect(resourcesChanged).toHaveBeenCalledTimes(1);
    const logged = vi.mocked(logEvent).mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY;
    const revoked = vi.mocked(revokeResourceAccess).mock.invocationCallOrder[0] ?? 0;
    expect(logged).toBeLessThan(revoked);
    expect(logEvent).toHaveBeenCalledWith({
      event: 'resource_deleted',
      resource: EXAMPLE,
      by: 'admin',
    });
  });

  it('refuses while a client holds a scope only it offers, and changes nothing', async () => {
    fake.held.add('example:read');

    const response = await post(`/admin/resources/${ID}/delete`, {});

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('example:read');
    expect(fake.rows.has(EXAMPLE)).toBe(true);
    expect(revokeResourceAccess).not.toHaveBeenCalled();
    expect(resourcesChanged).not.toHaveBeenCalled();
  });

  it('never deletes a built-in resource', async () => {
    const response = await post(
      `/admin/resources/${resourceId('https://lasso.example.com')}/delete`,
      {},
    );

    expect(response.status).toBe(302);
    expect(revokeResourceAccess).not.toHaveBeenCalled();
  });

  it('refuses a request from another site', async () => {
    const response = await post(`/admin/resources/${ID}/delete`, {}, 'cross-site');

    expect(response.status).toBe(403);
    expect(fake.rows.has(EXAMPLE)).toBe(true);
  });
});
