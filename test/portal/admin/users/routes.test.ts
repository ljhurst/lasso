import Koa from 'koa';
import type Provider from 'oidc-provider';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { logEvent } from '#src/observability/events.ts';
import { buildAdminRouter } from '#src/portal/admin/routes.ts';
import { revokeAllAccess } from '#src/portal/admin/revocation.ts';
import { serve, type TestServer } from '#test/support/http.ts';
import { makeUser } from '#test/support/users.ts';

const store = vi.hoisted(() => ({
  addRole: vi.fn(),
  removeRole: vi.fn(),
  deleteUser: vi.fn(),
  createUser: vi.fn(),
  setTemporaryPassword: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserBySub: vi.fn(),
  listUsers: vi.fn(),
}));
vi.mock('#src/users/storage/store.ts', () => store);

const data = vi.hoisted(() => ({
  listSessions: vi.fn(),
  listGrants: vi.fn(),
  listAccessTokens: vi.fn(),
}));
vi.mock('#src/adapter/records.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#src/adapter/records.ts')>()),
  ...data,
}));

vi.mock('#src/observability/events.ts', () => ({ logEvent: vi.fn() }));

vi.mock('#src/portal/admin/revocation.ts', () => ({
  revokeAllAccess: vi.fn(),
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
  return makeUser({ sub, roles });
}

describe('admin role changes', () => {
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

describe('admin user deletion', () => {
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
    store.getUserBySub.mockResolvedValue(user('sub-1', []));
  });

  function postDelete(sub: string, site = 'same-origin'): Promise<Response> {
    return fetch(`${baseUrl}/admin/users/${sub}/delete`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'sec-fetch-site': site },
    });
  }

  it('asks for confirmation before deleting anything', async () => {
    const response = await fetch(`${baseUrl}/admin/users/sub-1/delete`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('action="/admin/users/sub-1/delete"');
    expect(store.deleteUser).not.toHaveBeenCalled();
  });

  it('ends their access first, then deletes the account', async () => {
    const response = await postDelete('sub-1');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/admin/users');
    expect(revokeAllAccess).toHaveBeenCalledWith(expect.anything(), 'sub-1');
    expect(store.deleteUser).toHaveBeenCalledWith('sub-1');
    expect(vi.mocked(revokeAllAccess).mock.invocationCallOrder[0]).toBeLessThan(
      store.deleteUser.mock.invocationCallOrder[0] as number,
    );
  });

  it('logs who deleted whom, without the email', async () => {
    await postDelete('sub-1');

    expect(logEvent).toHaveBeenCalledWith({ event: 'user_deleted', sub: 'sub-1', by: 'admin' });
  });

  it('keeps the account when ending their access fails', async () => {
    vi.mocked(revokeAllAccess).mockRejectedValueOnce(new Error('boom'));

    const response = await postDelete('sub-1');

    expect(response.status).toBe(500);
    expect(store.deleteUser).not.toHaveBeenCalled();
  });

  it('refuses to delete your own account', async () => {
    store.getUserBySub.mockResolvedValue(user('admin', ['lasso:admin']));

    const response = await postDelete('admin');

    expect(response.headers.get('location')).toBe('/admin/users/admin');
    expect(revokeAllAccess).not.toHaveBeenCalled();
    expect(store.deleteUser).not.toHaveBeenCalled();
  });

  it('sends you back to the list for an unknown user', async () => {
    store.getUserBySub.mockResolvedValue(undefined);

    const response = await postDelete('nobody');

    expect(response.headers.get('location')).toBe('/admin/users');
    expect(store.deleteUser).not.toHaveBeenCalled();
  });

  it('refuses a delete sent from another site', async () => {
    const response = await postDelete('sub-1', 'cross-site');

    expect(response.status).toBe(403);
    expect(store.deleteUser).not.toHaveBeenCalled();
  });
});

describe('admin add user', () => {
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
    store.listUsers.mockResolvedValue([]);
    store.getUserByEmail.mockResolvedValue(undefined);
  });

  function postUser(fields: Record<string, string>, site = 'same-origin'): Promise<Response> {
    return fetch(`${baseUrl}/admin/users`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'sec-fetch-site': site,
      },
      body: new URLSearchParams({
        givenName: 'Friend',
        familyName: 'Person',
        email: 'Friend@Example.com',
        ...fields,
      }),
    });
  }

  it('creates the user and shows the temporary password once, uncached', async () => {
    const response = await postUser({});
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(store.createUser).toHaveBeenCalledTimes(1);
    const created = store.createUser.mock.calls[0]?.[0];
    expect(created).toMatchObject({
      email: 'friend@example.com',
      roles: [],
      mustChangePassword: true,
    });
    expect(html).toMatch(/id="temp-password">[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}</);
  });

  it('logs who created whom, without the email or the password', async () => {
    await postUser({});

    const created = store.createUser.mock.calls[0]?.[0];
    expect(logEvent).toHaveBeenCalledWith({
      event: 'user_created',
      sub: created.sub,
      by: 'admin',
    });
  });

  it('refuses an email that is already in use, and creates nothing', async () => {
    store.getUserByEmail.mockResolvedValue(user('sub-1', []));

    const response = await postUser({});

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('already exists');
    expect(store.createUser).not.toHaveBeenCalled();
  });

  it('ignores a role sent with the form, and grants none', async () => {
    await postUser({ role: 'lasso:admin' });

    expect(store.createUser.mock.calls[0]?.[0]).toMatchObject({ roles: [] });
  });

  it('serves the add-user page', async () => {
    const response = await fetch(`${baseUrl}/admin/users/new`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('action="/admin/users"');
  });

  it.each([
    ['an invalid email', { email: 'nope' }],
    ['a blank name', { givenName: '  ' }],
  ])('refuses %s, and creates nothing', async (_name, fields) => {
    const response = await postUser(fields);

    expect(response.status).toBe(400);
    expect(store.createUser).not.toHaveBeenCalled();
  });

  it('keeps what was typed when it refuses', async () => {
    const html = await (await postUser({ email: 'nope', givenName: 'Kept' })).text();

    expect(html).toContain('value="Kept"');
  });

  it('refuses a request sent from another site', async () => {
    const response = await postUser({}, 'cross-site');

    expect(response.status).toBe(403);
    expect(store.createUser).not.toHaveBeenCalled();
  });
});

describe('admin password reset', () => {
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
    store.getUserBySub.mockResolvedValue(user('sub-1', []));
  });

  function postReset(sub: string, site = 'same-origin'): Promise<Response> {
    return fetch(`${baseUrl}/admin/users/${sub}/reset-password`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'sec-fetch-site': site },
    });
  }

  it('asks for confirmation before changing anything', async () => {
    const response = await fetch(`${baseUrl}/admin/users/sub-1/reset-password`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('action="/admin/users/sub-1/reset-password"');
    expect(store.setTemporaryPassword).not.toHaveBeenCalled();
  });

  it('ends their access first, then sets the temporary password', async () => {
    const response = await postReset('sub-1');

    expect(response.status).toBe(200);
    expect(revokeAllAccess).toHaveBeenCalledWith(expect.anything(), 'sub-1');
    expect(store.setTemporaryPassword).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({ hash: expect.any(String), expiresAt: expect.any(Number) }),
    );
    expect(vi.mocked(revokeAllAccess).mock.invocationCallOrder[0]).toBeLessThan(
      store.setTemporaryPassword.mock.invocationCallOrder[0] as number,
    );
  });

  it('shows the new password once, uncached', async () => {
    const response = await postReset('sub-1');
    const html = await response.text();

    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(html).toMatch(/id="temp-password">[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}</);
    expect(html).toContain('Password reset for');
  });

  it('logs who reset whom, without the password', async () => {
    await postReset('sub-1');

    expect(logEvent).toHaveBeenCalledWith({ event: 'password_reset', sub: 'sub-1', by: 'admin' });
  });

  it('keeps the old password when ending their access fails', async () => {
    vi.mocked(revokeAllAccess).mockRejectedValueOnce(new Error('boom'));

    const response = await postReset('sub-1');

    expect(response.status).toBe(500);
    expect(store.setTemporaryPassword).not.toHaveBeenCalled();
  });

  it('refuses to reset your own password', async () => {
    store.getUserBySub.mockResolvedValue(user('admin', ['lasso:admin']));

    const response = await postReset('admin');

    expect(response.headers.get('location')).toBe('/admin/users/admin');
    expect(revokeAllAccess).not.toHaveBeenCalled();
    expect(store.setTemporaryPassword).not.toHaveBeenCalled();
  });

  it('sends you back to the list for an unknown user', async () => {
    store.getUserBySub.mockResolvedValue(undefined);

    const response = await postReset('nobody');

    expect(response.headers.get('location')).toBe('/admin/users');
    expect(store.setTemporaryPassword).not.toHaveBeenCalled();
  });

  it('refuses a reset sent from another site', async () => {
    const response = await postReset('sub-1', 'cross-site');

    expect(response.status).toBe(403);
    expect(store.setTemporaryPassword).not.toHaveBeenCalled();
  });
});
