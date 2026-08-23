import type Koa from 'koa';
import type Provider from 'oidc-provider';

export function buildHandleAdminLogout(provider: Provider) {
  return async function handleAdminLogout(ctx: Koa.Context): Promise<void> {
    const session = await provider.Session.get(ctx);
    await session.destroy();
    ctx.cookies.set(provider.cookieName('session'), null);
    ctx.redirect('/admin');
  };
}
