import Router from '@koa/router';
import koaBody from 'koa-body';
import type Provider from 'oidc-provider';
import { allResourceScopes } from '../config/resources.ts';
import { addRole, getUserBySub, listUsers } from '../users/store.ts';
import { handleAdminCallback } from './auth/callback.ts';
import { buildHandleAdminLogout } from './auth/logout.ts';
import { buildRequireAdminSession } from './auth/session.ts';
import { listAccessTokens, listGrants, listSessions } from './data.ts';
import { DashboardPage } from './views/dashboard.tsx';
import { UserDetailPage } from './views/user-detail.tsx';
import { UsersListPage } from './views/users.tsx';

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
    const users = await listUsers();

    ctx.type = 'html';
    ctx.body = await UsersListPage({ users });
  });

  router.get('/users/:sub', requireAdminSession, async (ctx) => {
    const user = ctx.params.sub ? await getUserBySub(ctx.params.sub) : undefined;
    if (!user) {
      ctx.redirect('/admin/users');
      return;
    }

    const [sessions, grants, accessTokens] = await Promise.all([
      listSessions(),
      listGrants(),
      listAccessTokens(),
    ]);

    ctx.type = 'html';
    ctx.body = await UserDetailPage({
      user,
      sessions: sessions.filter((s) => s.accountId === user.sub),
      grants: grants.filter((g) => g.accountId === user.sub),
      accessTokens: accessTokens.filter((t) => t.accountId === user.sub),
      grantableRoles: allResourceScopes.filter((role) => !user.roles.includes(role)),
    });
  });

  router.post('/users/:sub/roles', requireAdminSession, koaBody(), async (ctx) => {
    const { sub } = ctx.params;
    const { role } = ctx.request.body as { role?: string };
    if (sub && role && allResourceScopes.includes(role)) {
      await addRole(sub, role);
    }
    ctx.redirect(`/admin/users/${sub}`);
  });

  return router;
}
