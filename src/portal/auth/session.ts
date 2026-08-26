import { randomBytes } from 'node:crypto';
import type Koa from 'koa';
import type Provider from 'oidc-provider';
import { deriveChallenge, generateVerifier, requestOrigin, setPkceCookie } from '#src/auth/pkce.ts';
import { LASSO_ADMIN_SCOPE, LASSO_RESOURCE_INDICATOR } from '#src/config/resources.ts';
import { getUserBySub } from '#src/users/store.ts';
import { NoAccessPage } from '#src/portal/views/no-access.tsx';

export const PORTAL_CLIENT_ID = 'lasso-portal';
export const PORTAL_PKCE_AREA = { cookieName: 'portal_pkce', path: '/portal' };

export function hasAdminScope(scope: string[]): boolean {
  return scope.includes(LASSO_ADMIN_SCOPE);
}

function redirectToLogin(ctx: Koa.Context): void {
  const verifier = generateVerifier();
  const state = randomBytes(16).toString('base64url');
  const origin = requestOrigin(ctx);

  setPkceCookie(ctx, PORTAL_PKCE_AREA, { verifier, state, returnTo: ctx.href });

  const authorizeUrl = new URL('/auth', origin);
  authorizeUrl.searchParams.set('client_id', PORTAL_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', `${origin}/portal/callback`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', `openid ${LASSO_ADMIN_SCOPE}`);
  authorizeUrl.searchParams.set('resource', LASSO_RESOURCE_INDICATOR);
  authorizeUrl.searchParams.set('code_challenge', deriveChallenge(verifier));
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);

  ctx.redirect(authorizeUrl.toString());
}

export function buildRequirePortalSession(provider: Provider) {
  return async function requirePortalSession(ctx: Koa.Context, next: Koa.Next): Promise<void> {
    const session = await provider.Session.get(ctx);

    if (!session.accountId) {
      redirectToLogin(ctx);
      return;
    }

    const grantId = session.grantIdFor(PORTAL_CLIENT_ID);

    if (!grantId) {
      redirectToLogin(ctx);
      return;
    }

    const user = await getUserBySub(session.accountId);
    if (!user) {
      redirectToLogin(ctx);
      return;
    }

    const grant = await provider.Grant.find(grantId);
    const grantedScope = grant?.getResourceScope(LASSO_RESOURCE_INDICATOR).split(' ') ?? [];

    ctx.state.user = user;
    ctx.state.isAdmin = hasAdminScope(grantedScope);
    await next();
  };
}

export async function requireAdmin(ctx: Koa.Context, next: Koa.Next): Promise<void> {
  if (!ctx.state.isAdmin) {
    ctx.status = 403;
    ctx.type = 'html';
    ctx.body = await NoAccessPage();
    return;
  }
  await next();
}
