import type Koa from 'koa';
import { clearPkceCookie, readPkceCookie, requestOrigin } from './pkce.ts';
import { ADMIN_CLIENT_ID } from './session.ts';

export async function handleAdminCallback(ctx: Koa.Context): Promise<void> {
  const pkce = readPkceCookie(ctx);
  clearPkceCookie(ctx);

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
      redirect_uri: `${origin}/admin/callback`,
      client_id: ADMIN_CLIENT_ID,
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
