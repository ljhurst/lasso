import type Koa from 'koa';
import type Provider from 'oidc-provider';
import { describe, expect, it, vi } from 'vitest';
import { buildRequirePortalSession, hasAdminScope } from '#src/portal/auth/session.ts';

describe('hasAdminScope', () => {
  it('returns false for an empty scope', () => {
    expect(hasAdminScope([])).toBe(false);
  });

  it('returns true when lasso:admin is present', () => {
    expect(hasAdminScope(['openid', 'lasso:admin'])).toBe(true);
  });

  it('returns false when only unrelated scopes are present', () => {
    expect(hasAdminScope(['fife:read', 'fife:write'])).toBe(false);
  });
});

describe('requirePortalSession', () => {
  it('builds the login redirect from the issuer, ignoring a forged host', async () => {
    const provider = { Session: { get: async () => ({}) } } as unknown as Provider;
    const set = vi.fn();
    const redirect = vi.fn();
    const ctx = {
      host: 'attacker.invalid',
      protocol: 'https',
      originalUrl: '/admin?x=1',
      secure: true,
      cookies: { set },
      redirect,
    } as unknown as Koa.Context;

    await buildRequirePortalSession(provider)(ctx, async () => {});

    const location = new URL(redirect.mock.calls[0]?.[0]);
    expect(location.origin).toBe('https://lasso.example.com');
    expect(location.searchParams.get('redirect_uri')).toBe(
      'https://lasso.example.com/portal/callback',
    );

    const cookie = JSON.parse(Buffer.from(set.mock.calls[0]?.[1], 'base64url').toString('utf8'));
    expect(cookie.returnTo).toBe('/admin?x=1');
  });
});
