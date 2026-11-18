import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import Koa from 'koa';
import type Provider from 'oidc-provider';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAdminRouter, buildHeldRoles, canRemoveRole } from '#src/portal/admin/routes.ts';

const store = vi.hoisted(() => ({
  addRole: vi.fn(),
  removeRole: vi.fn(),
  getUserBySub: vi.fn(),
  listUsers: vi.fn(),
}));
vi.mock('#src/users/store.ts', () => store);

const data = vi.hoisted(() => ({
  listSessions: vi.fn(),
  listGrants: vi.fn(),
  listAccessTokens: vi.fn(),
}));
vi.mock('#src/portal/admin/data.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#src/portal/admin/data.ts')>()),
  ...data,
}));

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

describe('buildHeldRoles', () => {
  it('lists the roles a user holds, sorted', () => {
    const roles = buildHeldRoles(user('sub-1', ['fife:read', 'freal:read']), 'admin');

    expect(roles.map((held) => held.role)).toEqual(['fife:read', 'freal:read']);
  });

  it('marks a held role that is no longer configured', () => {
    const [held] = buildHeldRoles(user('sub-1', ['retired:read']), 'admin');

    expect(held).toEqual({ role: 'retired:read', registered: false, blockedReason: undefined });
  });

  it('refuses to let an admin remove their own admin role', () => {
    const [own] = buildHeldRoles(user('admin', ['lasso:admin']), 'admin');
    const [theirs] = buildHeldRoles(user('sub-1', ['lasso:admin']), 'admin');

    expect(own?.blockedReason).toBe("Can't remove your own admin role");
    expect(theirs?.blockedReason).toBeUndefined();
  });
});

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

describe('admin user page', () => {
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
    store.getUserBySub.mockResolvedValue(user('sub-1', []));
    data.listSessions.mockResolvedValue([
      { id: 'sess-old', accountId: 'sub-1', clientIds: [], expiresAt: 100 },
      { id: 'sess-none', accountId: 'sub-1', clientIds: [] },
      { id: 'sess-new', accountId: 'sub-1', clientIds: [], expiresAt: 300 },
      { id: 'sess-other', accountId: 'sub-2', clientIds: [], expiresAt: 999 },
    ]);
    data.listGrants.mockResolvedValue([
      { id: 'grant-old', accountId: 'sub-1', expiresAt: 100 },
      { id: 'grant-new', accountId: 'sub-1', expiresAt: 300 },
    ]);
    data.listAccessTokens.mockResolvedValue([
      { id: 't1', accountId: 'sub-1', scope: 'tok:old', expiresAt: 100 },
      { id: 't2', accountId: 'sub-1', scope: 'tok:new', expiresAt: 300 },
    ]);
  });

  async function page(): Promise<string> {
    return (await fetch(`${baseUrl}/admin/users/sub-1`)).text();
  }

  it.each([
    ['sessions', ['sess-new', 'sess-old', 'sess-none']],
    ['grants', ['grant-new', 'grant-old']],
    ['access tokens', ['tok:new', 'tok:old']],
  ])('lists %s newest first', async (_name, expected) => {
    const html = await page();
    const positions = expected.map((marker) => html.indexOf(marker));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('lists the roles the user holds', async () => {
    store.getUserBySub.mockResolvedValue(user('sub-1', ['fife:read']));

    expect(await page()).toContain('aria-label="Remove fife:read"');
  });

  it("leaves out another account's rows", async () => {
    expect(await page()).not.toContain('sess-other');
  });
});
