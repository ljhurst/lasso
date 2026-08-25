import { randomBytes } from 'node:crypto';
import type Koa from 'koa';
import type Provider from 'oidc-provider';
import { getUserBySub } from '../../users/store.ts';
import { deriveChallenge, generateVerifier, requestOrigin, setPkceCookie } from './pkce.ts';

export const ADMIN_CLIENT_ID = 'lasso-admin';

function redirectToLogin(ctx: Koa.Context): void {
  const verifier = generateVerifier();
  const state = randomBytes(16).toString('base64url');
  const origin = requestOrigin(ctx);

  setPkceCookie(ctx, { verifier, state, returnTo: ctx.href });

  const authorizeUrl = new URL('/auth', origin);
  authorizeUrl.searchParams.set('client_id', ADMIN_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', `${origin}/admin/callback`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'openid');
  authorizeUrl.searchParams.set('code_challenge', deriveChallenge(verifier));
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);

  ctx.redirect(authorizeUrl.toString());
}

export function buildRequireAdminSession(provider: Provider) {
  return async function requireAdminSession(ctx: Koa.Context, next: Koa.Next): Promise<void> {
    const session = await provider.Session.get(ctx);

    if (!session.accountId) {
      redirectToLogin(ctx);
      return;
    }

    const user = await getUserBySub(session.accountId);
    if (!user?.roles.includes('admin')) {
      redirectToLogin(ctx);
      return;
    }

    ctx.state.adminUser = user;
    await next();
  };
}
