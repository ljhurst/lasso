import type Koa from 'koa';
import { issuerOrigin } from '#src/auth/pkce.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Refuses state-changing requests that did not come from this origin's own
 * pages. SameSite cookies treat every subdomain of the registrable domain as
 * the same site, so a sibling app could otherwise send the session cookie.
 */
export const requireSameOrigin: Koa.Middleware = async (ctx, next) => {
  if (SAFE_METHODS.has(ctx.method) || fromOwnOrigin(ctx)) {
    await next();
    return;
  }
  ctx.status = 403;
  ctx.type = 'text';
  ctx.body = 'Forbidden';
};

function fromOwnOrigin(ctx: Koa.Context): boolean {
  const fetchSite = ctx.get('sec-fetch-site');
  if (fetchSite) {
    return fetchSite === 'same-origin';
  }
  const origin = ctx.get('origin');
  return origin !== '' && origin === issuerOrigin();
}
