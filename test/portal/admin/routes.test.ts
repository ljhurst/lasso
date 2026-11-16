import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import Koa from 'koa';
import type Provider from 'oidc-provider';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAdminRouter, canRemoveRole } from '#src/portal/admin/routes.ts';

const store = vi.hoisted(() => ({
  addRole: vi.fn(),
  removeRole: vi.fn(),
  getUserBySub: vi.fn(),
  listUsers: vi.fn(),
}));
vi.mock('#src/users/store.ts', () => store);

vi.mock('#src/portal/admin/revocation.ts', () => ({
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

function user(sub: string, roles: string[]) {
  return {
    sub,
    email: `${sub}@example.com`,
    emailVerified: true,
    givenName: 'Friend',
    familyName: 'Person',
    passwordHash: 'hash',
    passwordSalt: 'salt',
    mustChangePassword: false,
    roles,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('canRemoveRole', () => {
  it('allows removing a role the user holds', () => {
    expect(canRemoveRole(user('sub-1', ['fife:read']), 'fife:read', 'admin')).toBe(true);
  });

  it('allows removing a held role that is no longer configured', () => {
    expect(canRemoveRole(user('sub-1', ['retired:read']), 'retired:read', 'admin')).toBe(true);
  });

  it('allows a known scope the user no longer holds, so revocation can be retried', () => {
    expect(canRemoveRole(user('sub-1', []), 'fife:read', 'admin')).toBe(true);
  });

  it('refuses an unknown role the user does not hold', () => {
    expect(canRemoveRole(user('sub-1', []), 'made:up', 'admin')).toBe(false);
  });

  it('refuses an admin removing their own admin role', () => {
    expect(canRemoveRole(user('admin', ['lasso:admin']), 'lasso:admin', 'admin')).toBe(false);
  });

  it("allows removing someone else's admin role", () => {
    expect(canRemoveRole(user('sub-1', ['lasso:admin']), 'lasso:admin', 'admin')).toBe(true);
  });
});

describe('admin role changes', () => {
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
  });

  function grantRole(headers: Record<string, string>): Promise<Response> {
    return fetch(`${baseUrl}/admin/users/sub-1/roles`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
      body: new URLSearchParams({ role: 'fife:read' }),
    });
  }

  it('refuses a role grant sent from a sibling subdomain', async () => {
    const response = await grantRole({ 'sec-fetch-site': 'same-site' });

    expect(response.status).toBe(403);
    expect(store.addRole).not.toHaveBeenCalled();
  });

  it('refuses a role removal sent from another site', async () => {
    const response = await fetch(`${baseUrl}/admin/users/sub-1/roles/remove`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'sec-fetch-site': 'cross-site',
      },
      body: new URLSearchParams({ role: 'fife:read' }),
    });

    expect(response.status).toBe(403);
    expect(store.removeRole).not.toHaveBeenCalled();
  });

  it('grants a role from the admin page itself', async () => {
    const response = await grantRole({ 'sec-fetch-site': 'same-origin' });

    expect(response.status).toBe(302);
    expect(store.addRole).toHaveBeenCalledWith('sub-1', 'fife:read');
  });
});
