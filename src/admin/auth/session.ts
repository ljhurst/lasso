import { randomBytes } from 'node:crypto';
import type Koa from 'koa';
import type Provider from 'oidc-provider';
import { LASSO_ADMIN_SCOPE, LASSO_RESOURCE_INDICATOR } from '../../config/resources.ts';
import { getUserBySub } from '../../users/store.ts';
import { NoAccessPage } from '../views/no-access.tsx';
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
  authorizeUrl.searchParams.set('scope', `openid ${LASSO_ADMIN_SCOPE}`);
  authorizeUrl.searchParams.set('resource', LASSO_RESOURCE_INDICATOR);
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

    const grantId = session.grantIdFor(ADMIN_CLIENT_ID);

    if (!grantId) {
      redirectToLogin(ctx);
      return;
    }

    const grant = await provider.Grant.find(grantId);
    const grantedScope = grant?.getResourceScope(LASSO_RESOURCE_INDICATOR).split(' ') ?? [];

    if (!grantedScope.includes(LASSO_ADMIN_SCOPE)) {
      ctx.status = 403;
      ctx.type = 'html';
      ctx.body = await NoAccessPage();
      return;
    }

    const user = await getUserBySub(session.accountId);
    if (!user) {
      redirectToLogin(ctx);
      return;
    }

    ctx.state.adminUser = user;
    await next();
  };
}
