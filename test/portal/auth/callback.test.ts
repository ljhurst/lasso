import type Koa from 'koa';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handlePortalCallback } from '#src/portal/auth/callback.ts';

function callbackContext(cookie: unknown, query: Record<string, string>): Koa.Context {
  return {
    query,
    cookies: {
      get: () => cookie,
      set: vi.fn(),
    },
    redirect: vi.fn(),
  } as unknown as Koa.Context;
}

describe('handlePortalCallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a login with no state in the cookie or the request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const cookie = Buffer.from(JSON.stringify({ verifier: 'v', returnTo: '/admin' })).toString(
      'base64url',
    );
    const ctx = callbackContext(cookie, { code: 'abc' });

    await handlePortalCallback(ctx);

    expect(ctx.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ctx.redirect).not.toHaveBeenCalled();
  });
});
