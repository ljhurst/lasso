import Router from '@koa/router';
import type Provider from 'oidc-provider';
import { handleAdminCallback } from './auth/callback.ts';
import { buildHandleAdminLogout } from './auth/logout.ts';
import { buildRequireAdminSession } from './auth/session.ts';
import { listAccessTokens, listGrants, listSessions } from './data.ts';
import { DashboardPage } from './views/dashboard.tsx';
import { UsersPage } from './views/users.tsx';

export function buildAdminRouter(provider: Provider): Router {
  const router = new Router({ prefix: '/admin' });
  const requireAdminSession = buildRequireAdminSession(provider);

  router.get('/callback', handleAdminCallback);
  router.post('/logout', buildHandleAdminLogout(provider));

  router.get('/', requireAdminSession, async (ctx) => {
    ctx.type = 'html';
    ctx.body = await DashboardPage();
  });

  router.get('/users', requireAdminSession, async (ctx) => {
    const [sessions, grants, accessTokens] = await Promise.all([
      listSessions(),
      listGrants(),
      listAccessTokens(),
    ]);

    ctx.type = 'html';
    ctx.body = await UsersPage({
      username: ctx.state.adminUsername as string,
      sessions,
      grants,
      accessTokens,
    });
  });

  return router;
}
