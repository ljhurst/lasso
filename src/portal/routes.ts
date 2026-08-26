import Router from '@koa/router';
import type Provider from 'oidc-provider';
import { handlePortalCallback } from '#src/portal/auth/callback.ts';
import { buildHandlePortalLogout } from '#src/portal/auth/logout.ts';

export function buildPortalRouter(provider: Provider): Router {
  const router = new Router({ prefix: '/portal' });

  router.get('/callback', handlePortalCallback);
  router.post('/logout', buildHandlePortalLogout(provider));

  return router;
}

export function buildRootRouter(): Router {
  const router = new Router();

  router.get('/', (ctx) => {
    ctx.redirect('/apps');
  });

  return router;
}
