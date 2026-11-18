import type Koa from 'koa';
import type Provider from 'oidc-provider';
import { APPS_URL } from '#src/portal/paths.ts';

export function buildHandlePortalLogout(provider: Provider) {
  return async function handlePortalLogout(ctx: Koa.Context): Promise<void> {
    const session = await provider.Session.get(ctx);
    await session.destroy();
    ctx.cookies.set(provider.cookieName('session'), null);
    ctx.redirect(APPS_URL);
  };
}
