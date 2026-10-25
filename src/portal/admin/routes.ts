import Router from '@koa/router';
import type Provider from 'oidc-provider';
import { allResourceScopes, LASSO_ADMIN_SCOPE } from '#src/config/resources.ts';
import { readForm } from '#src/form-body.ts';
import { addRole, getUserBySub, listUsers, removeRole } from '#src/users/store.ts';
import { buildRequirePortalSession, requireAdmin } from '#src/portal/auth/session.ts';
import { listAccessTokens, listGrants, listSessions } from '#src/portal/admin/data.ts';
import { revokeGrantsWithScope } from '#src/portal/admin/revocation.ts';
import { DashboardPage } from '#src/portal/admin/views/dashboard.tsx';
import { UserDetailPage } from '#src/portal/admin/views/user-detail.tsx';
import { UsersListPage } from '#src/portal/admin/views/users.tsx';
import type { User } from '#src/users/types.ts';

/**
 * Whether an admin may remove `role` from `target`. Roles the target holds are
 * removable even after leaving the config, and known scopes are accepted even
 * once gone so a revocation that failed partway can be retried. Admins can't
 * drop their own admin role.
 */
export function canRemoveRole(target: User, role: string, actorSub: string): boolean {
  const isKnown = target.roles.includes(role) || allResourceScopes.includes(role);
  const isSelfLockout = target.sub === actorSub && role === LASSO_ADMIN_SCOPE;
  return isKnown && !isSelfLockout;
}

export function buildAdminRouter(provider: Provider): Router {
  const router = new Router({ prefix: '/admin' });
  const requirePortalSession = buildRequirePortalSession(provider);

  router.use(requirePortalSession, requireAdmin);

  router.get('/', async (ctx) => {
    ctx.type = 'html';
    ctx.body = await DashboardPage();
  });

  router.get('/users', async (ctx) => {
    const users = await listUsers();

    ctx.type = 'html';
    ctx.body = await UsersListPage({ users });
  });

  router.get('/users/:sub', async (ctx) => {
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

  router.post('/users/:sub/roles', async (ctx) => {
    const { sub } = ctx.params;
    const role = (await readForm(ctx)).get('role');
    if (sub && role && allResourceScopes.includes(role)) {
      await addRole(sub, role);
    }
    ctx.redirect(`/admin/users/${sub}`);
  });

  router.post('/users/:sub/roles/remove', async (ctx) => {
    const user = ctx.params.sub ? await getUserBySub(ctx.params.sub) : undefined;
    if (!user) {
      ctx.redirect('/admin/users');
      return;
    }

    const role = (await readForm(ctx)).get('role');
    if (role && canRemoveRole(user, role, ctx.state.user.sub)) {
      await removeRole(user.sub, role);
      await revokeGrantsWithScope(provider, user.sub, role);
    }
    ctx.redirect(`/admin/users/${user.sub}`);
  });

  return router;
}
