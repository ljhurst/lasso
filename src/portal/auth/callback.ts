import type Koa from 'koa';
import { clearPkceCookie, readPkceCookie, requestOrigin } from '../../auth/pkce.ts';
import { PORTAL_CLIENT_ID, PORTAL_PKCE_AREA } from './session.ts';

export async function handlePortalCallback(ctx: Koa.Context): Promise<void> {
  const pkce = readPkceCookie(ctx, PORTAL_PKCE_AREA);
  clearPkceCookie(ctx, PORTAL_PKCE_AREA);

  const { code, state } = ctx.query as { code?: string; state?: string };

  if (!pkce || !code || state !== pkce.state) {
    ctx.status = 400;
    ctx.body = 'Invalid or expired login attempt — please try again.';
    return;
  }

  const origin = requestOrigin(ctx);

  const tokenResponse = await fetch(new URL('/token', origin), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${origin}/portal/callback`,
      client_id: PORTAL_CLIENT_ID,
      code_verifier: pkce.verifier,
    }),
  });

  if (!tokenResponse.ok) {
    ctx.status = 401;
    ctx.body = 'Login failed.';
    return;
  }

  ctx.redirect(pkce.returnTo);
}
