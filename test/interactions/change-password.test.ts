import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import Koa from 'koa';
import type Provider from 'oidc-provider';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.LASSO_OIDC_TABLE_NAME ??= 'lj-lasso-test';
process.env.LASSO_USERS_TABLE_NAME ??= 'lj-lasso-users-test';
process.env.LASSO_JWKS_SSM_PARAM ??= '/lasso/jwks-test';
process.env.LASSO_COOKIE_KEY_SSM_PARAM ??= '/lasso/cookie-key-test';
process.env.LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM ??=
  '/lasso/porto-victoria-client-secret-test';
process.env.LASSO_ISSUER ??= 'https://lasso.example.com';

const store = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  getUserBySub: vi.fn(),
  updatePassword: vi.fn(),
}));
vi.mock('#src/users/store.ts', () => store);

const { hashPassword } = await import('#src/users/password.ts');
const { buildInteractionRouter } = await import('#src/interactions/routes.ts');

const TEMP_PASSWORD = 'temporary-password';
const VICTIM_SUB = 'victim-sub';
const VICTIM_EMAIL = 'victim@example.com';

const interactionFinished = vi.fn();
const provider = {
  interactionDetails: async () => ({ uid: 'uid1', prompt: { name: 'login' } }),
  interactionFinished,
} as unknown as Provider;

let server: Server;
let baseUrl: string;

async function userRecord(mustChangePassword: boolean) {
  const { hash, salt } = await hashPassword(TEMP_PASSWORD);
  return {
    sub: VICTIM_SUB,
    email: VICTIM_EMAIL,
    emailVerified: true,
    givenName: 'Vic',
    familyName: 'Tim',
    passwordHash: hash,
    passwordSalt: salt,
    mustChangePassword,
    roles: ['lasso:admin'],
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function post(path: string, fields: Record<string, string>): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
  });
}

function changePassword(fields: Record<string, string>): Promise<Response> {
  return post('/interaction/uid1/change-password', fields);
}

beforeAll(async () => {
  const app = new Koa();
  const router = buildInteractionRouter(provider);
  app.use(router.routes());
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(async () => {
  vi.clearAllMocks();
  const user = await userRecord(true);
  store.getUserByEmail.mockImplementation(async (email: string) =>
    email === VICTIM_EMAIL ? user : undefined,
  );
  store.getUserBySub.mockImplementation(async (sub: string) =>
    sub === VICTIM_SUB ? user : undefined,
  );
});

describe('POST /interaction/:uid/change-password', () => {
  it('ignores a forged sub when no credentials are given', async () => {
    await changePassword({ sub: VICTIM_SUB, password: 'attacker', confirm: 'attacker' });

    expect(store.updatePassword).not.toHaveBeenCalled();
    expect(interactionFinished).not.toHaveBeenCalled();
  });

  it('rejects a wrong current password', async () => {
    await changePassword({
      email: VICTIM_EMAIL,
      current: 'wrong',
      password: 'new-password',
      confirm: 'new-password',
    });

    expect(store.updatePassword).not.toHaveBeenCalled();
    expect(interactionFinished).not.toHaveBeenCalled();
  });

  it('rejects a user who is not mid forced password change', async () => {
    const user = await userRecord(false);
    store.getUserByEmail.mockResolvedValue(user);

    const response = await changePassword({
      email: VICTIM_EMAIL,
      current: TEMP_PASSWORD,
      password: 'new-password',
      confirm: 'new-password',
    });

    expect(response.status).toBe(400);
    expect(store.updatePassword).not.toHaveBeenCalled();
    expect(interactionFinished).not.toHaveBeenCalled();
  });

  it('rejects mismatched new passwords', async () => {
    await changePassword({
      email: VICTIM_EMAIL,
      current: TEMP_PASSWORD,
      password: 'new-password',
      confirm: 'different',
    });

    expect(store.updatePassword).not.toHaveBeenCalled();
    expect(interactionFinished).not.toHaveBeenCalled();
  });

  it('rejects a new password equal to the current one', async () => {
    await changePassword({
      email: VICTIM_EMAIL,
      current: TEMP_PASSWORD,
      password: TEMP_PASSWORD,
      confirm: TEMP_PASSWORD,
    });

    expect(store.updatePassword).not.toHaveBeenCalled();
    expect(interactionFinished).not.toHaveBeenCalled();
  });

  it('changes the password of the user who proved the current one', async () => {
    await changePassword({
      sub: 'someone-else',
      email: VICTIM_EMAIL,
      current: TEMP_PASSWORD,
      password: 'new-password',
      confirm: 'new-password',
    });

    expect(store.updatePassword).toHaveBeenCalledOnce();
    expect(store.updatePassword.mock.calls[0]?.[0]).toBe(VICTIM_SUB);
    expect(interactionFinished.mock.calls[0]?.[2]).toEqual({ login: { accountId: VICTIM_SUB } });
  });
});

describe('POST /interaction/:uid/login', () => {
  it('shows the change form with the email and without the sub', async () => {
    const response = await post('/interaction/uid1/login', {
      email: VICTIM_EMAIL,
      password: TEMP_PASSWORD,
    });
    const html = await response.text();

    expect(html).toContain(`value="${VICTIM_EMAIL}"`);
    expect(html).not.toContain(VICTIM_SUB);
    expect(interactionFinished).not.toHaveBeenCalled();
  });
});
