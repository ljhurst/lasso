import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import Koa from 'koa';
import { describe, expect, it } from 'vitest';

process.env.LASSO_OIDC_TABLE_NAME ??= 'lj-lasso-test';
process.env.LASSO_USERS_TABLE_NAME ??= 'lj-lasso-users-test';
process.env.LASSO_JWKS_SSM_PARAM ??= '/lasso/jwks-test';
process.env.LASSO_COOKIE_KEY_SSM_PARAM ??= '/lasso/cookie-key-test';
process.env.LASSO_THROTTLE_TABLE_NAME ??= 'lj-lasso-throttle-test';
process.env.LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM ??=
  '/lasso/porto-victoria-client-secret-test';
process.env.LASSO_ISSUER ??= 'https://lasso.example.com';

const { readPkceCookie, setPkceCookie } = await import('#src/auth/pkce.ts');

const AREA = { cookieName: 'test_pkce', path: '/' };
const VALID = { verifier: 'verifier', state: 'state', returnTo: '/admin?x=1' };

function newApp(key = 'test-key'): Koa {
  const app = new Koa();
  app.keys = [key];
  return app;
}

function contextWithCookie(app: Koa, cookieHeader?: string): Koa.Context {
  const req = new IncomingMessage(new Socket());
  if (cookieHeader) {
    req.headers.cookie = cookieHeader;
  }
  return app.createContext(req, new ServerResponse(req));
}

function issuedCookie(app: Koa, value: unknown): string {
  const ctx = contextWithCookie(app);
  setPkceCookie(ctx, AREA, value as typeof VALID);
  const setCookie = ctx.res.getHeader('set-cookie') as string[];
  return setCookie.map((entry) => entry.split(';')[0]).join('; ');
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('pkce cookie', () => {
  it('round-trips a valid value', () => {
    const app = newApp();
    const ctx = contextWithCookie(app, issuedCookie(app, VALID));
    expect(readPkceCookie(ctx, AREA)).toEqual(VALID);
  });

  it('treats a tampered value as missing', () => {
    const app = newApp();
    const issued = issuedCookie(app, VALID);
    const forged = issued.replace(/=[^.;]+/, `=${encode({ ...VALID, returnTo: '/portal/other' })}`);
    expect(readPkceCookie(contextWithCookie(app, forged), AREA)).toBeUndefined();
  });

  it('treats an unsigned cookie as missing', () => {
    const app = newApp();
    const ctx = contextWithCookie(app, `${AREA.cookieName}=${encode(VALID)}`);
    expect(readPkceCookie(ctx, AREA)).toBeUndefined();
  });

  it('treats a cookie signed with another key as missing', () => {
    const issued = issuedCookie(newApp('other-key'), VALID);
    expect(readPkceCookie(contextWithCookie(newApp(), issued), AREA)).toBeUndefined();
  });

  it.each([
    ['no state', { verifier: 'v', returnTo: '/admin' }],
    ['an empty verifier', { verifier: '', state: 's', returnTo: '/admin' }],
    ['a non-string state', { verifier: 'v', state: 1, returnTo: '/admin' }],
    ['a null body', null],
  ])('treats a signed cookie with %s as missing', (_name, value) => {
    const app = newApp();
    const ctx = contextWithCookie(app, issuedCookie(app, value));
    expect(readPkceCookie(ctx, AREA)).toBeUndefined();
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'admin', ''])(
    'treats a signed cookie with returnTo %j as missing',
    (returnTo) => {
      const app = newApp();
      const ctx = contextWithCookie(app, issuedCookie(app, { ...VALID, returnTo }));
      expect(readPkceCookie(ctx, AREA)).toBeUndefined();
    },
  );
});
