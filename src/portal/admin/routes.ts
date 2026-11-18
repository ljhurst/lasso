import Router, { type RouterContext } from '@koa/router';
import type Provider from 'oidc-provider';
import { requireSameOrigin } from '#src/auth/same-origin.ts';
import { allResourceScopes, LASSO_ADMIN_SCOPE } from '#src/config/resources.ts';
import { readForm } from '#src/form-body.ts';
import { logEvent } from '#src/observability/events.ts';
import { parseNewUser, buildNewUser } from '#src/users/provision.ts';
import {
  addRole,
  createUser,
  deleteUser,
  getUserByEmail,
  getUserBySub,
  listUsers,
  removeRole,
} from '#src/users/store.ts';
import { buildRequirePortalSession, requireAdmin } from '#src/portal/auth/session.ts';
import {
  byLatestExpiry,
  listAccessTokens,
  listGrants,
  listSessions,
} from '#src/portal/admin/data.ts';
import {
  revokeAllAccess,
  revokeGrantsRejectingScope,
  revokeGrantsWithScope,
} from '#src/portal/admin/revocation.ts';
import { DashboardPage } from '#src/portal/admin/views/dashboard.tsx';
import { CreatedUserPage } from '#src/portal/admin/views/created-user.tsx';
import { DeleteUserPage } from '#src/portal/admin/views/delete-user.tsx';
import { type HeldRole, UserDetailPage } from '#src/portal/admin/views/user-detail.tsx';
import { type NewUserForm, NewUserPage } from '#src/portal/admin/views/new-user.tsx';
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

/** Admins can't delete their own account, so they can't lock themselves out. */
export function canDeleteUser(target: User, actorSub: string): boolean {
  return target.sub !== actorSub;
}

export function buildHeldRoles(user: User, actorSub: string): HeldRole[] {
  return user.roles.toSorted().map((role) => ({
    role,
    registered: allResourceScopes.includes(role),
    blockedReason: canRemoveRole(user, role, actorSub)
      ? undefined
      : "Can't remove your own admin role",
  }));
}

/**
 * Gives `sub` the role, then clears any grant that rejected it. The role goes
 * first so a login between the two steps sees it; repeating the call retries
 * a failed revocation because adding a held role is a no-op.
 */
export async function assignRole(provider: Provider, sub: string, role: string): Promise<void> {
  await addRole(sub, role);
  await revokeGrantsRejectingScope(provider, sub, role);
}

export function buildAdminRouter(provider: Provider): Router {
  const router = new Router({ prefix: '/admin' });
  const requirePortalSession = buildRequirePortalSession(provider);

  router.use(requireSameOrigin, requirePortalSession, requireAdmin);

  router.get('/', async (ctx) => {
    ctx.type = 'html';
    ctx.body = await DashboardPage();
  });

  router.get('/users', async (ctx) => {
    ctx.type = 'html';
    ctx.body = await UsersListPage({ users: await listUsers() });
  });

  router.get('/users/new', async (ctx) => {
    ctx.type = 'html';
    ctx.body = await NewUserPage({});
  });

  router.post('/users', async (ctx) => {
    const form = await readForm(ctx);
    const parsed = parseNewUser(form);
    if ('error' in parsed) {
      await renderNewUserPage(ctx, { error: parsed.error, values: formValues(form) });
      return;
    }

    const { user, tempPassword } = await buildNewUser({ ...parsed.details, roles: [] });

    if (await getUserByEmail(user.email)) {
      await renderNewUserPage(ctx, {
        error: 'A user with that email already exists.',
        values: formValues(form),
      });
      return;
    }

    await createUser(user);
    logEvent({ event: 'user_created', sub: user.sub, by: ctx.state.user.sub });

    ctx.set('Cache-Control', 'no-store');
    ctx.type = 'html';
    ctx.body = await CreatedUserPage({ user, tempPassword });
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
      sessions: sessions.filter((s) => s.accountId === user.sub).sort(byLatestExpiry),
      grants: grants.filter((g) => g.accountId === user.sub).sort(byLatestExpiry),
      accessTokens: accessTokens.filter((t) => t.accountId === user.sub).sort(byLatestExpiry),
      roles: buildHeldRoles(user, ctx.state.user.sub),
      canDelete: canDeleteUser(user, ctx.state.user.sub),
      grantableRoles: allResourceScopes.filter((role) => !user.roles.includes(role)),
    });
  });

  router.post('/users/:sub/roles', async (ctx) => {
    const { sub } = ctx.params;
    const role = (await readForm(ctx)).get('role');
    if (sub && role && allResourceScopes.includes(role)) {
      await assignRole(provider, sub, role);
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

  router.get('/users/:sub/delete', async (ctx) => {
    const user = await findDeletableUser(ctx);
    if (!user) {
      return;
    }

    ctx.type = 'html';
    ctx.body = await DeleteUserPage({ user });
  });

  router.post('/users/:sub/delete', async (ctx) => {
    const user = await findDeletableUser(ctx);
    if (!user) {
      return;
    }

    await revokeAllAccess(provider, user.sub);
    await deleteUser(user.sub);
    logEvent({ event: 'user_deleted', sub: user.sub, by: ctx.state.user.sub });
    ctx.redirect('/admin/users');
  });

  return router;
}

/** Loads the user in the URL, or redirects away and returns nothing when they can't be deleted. */
async function findDeletableUser(ctx: RouterContext): Promise<User | undefined> {
  const user = ctx.params.sub ? await getUserBySub(ctx.params.sub) : undefined;
  if (user && canDeleteUser(user, ctx.state.user.sub)) {
    return user;
  }
  ctx.redirect(user ? `/admin/users/${user.sub}` : '/admin/users');
  return undefined;
}

async function renderNewUserPage(
  ctx: RouterContext,
  form: { error: string; values: NewUserForm },
): Promise<void> {
  ctx.status = 400;
  ctx.type = 'html';
  ctx.body = await NewUserPage(form);
}

function formValues(form: URLSearchParams): NewUserForm {
  return {
    givenName: form.get('givenName') ?? '',
    familyName: form.get('familyName') ?? '',
    email: form.get('email') ?? '',
  };
}
