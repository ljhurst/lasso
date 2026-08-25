import Router from '@koa/router';
import type Provider from 'oidc-provider';
import type { User } from '../users/types.ts';
import { handleAdminCallback } from './auth/callback.ts';
import { buildHandleAdminLogout } from './auth/logout.ts';
import { buildRequireAdminSession } from './auth/session.ts';
import { listAccessTokens, listGrants, listSessions, resolveAccountEmails } from './data.ts';
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

    const accountEmails = await resolveAccountEmails([
      ...sessions.map((s) => s.accountId),
      ...grants.map((g) => g.accountId),
      ...accessTokens.map((t) => t.accountId),
    ]);

    ctx.type = 'html';
    ctx.body = await UsersPage({
      admin: ctx.state.adminUser as User,
      sessions,
      grants,
      accessTokens,
      accountEmails,
    });
  });

  return router;
}
