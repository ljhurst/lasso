import Router from '@koa/router';
import type Provider from 'oidc-provider';
import { handlePortalCallback } from './auth/callback.ts';
import { buildHandlePortalLogout } from './auth/logout.ts';

export function buildPortalRouter(provider: Provider): Router {
  const router = new Router({ prefix: '/portal' });

  router.get('/callback', handlePortalCallback);
  router.post('/logout', buildHandlePortalLogout(provider));

  return router;
}
