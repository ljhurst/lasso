import type Router from '@koa/router';
import type { RouterContext } from '@koa/router';
import type Provider from 'oidc-provider';
import { listAccessTokens, listGrants, listSessions } from '#src/adapter/records.ts';
import { readForm } from '#src/form-body.ts';
import { logEvent } from '#src/observability/events.ts';
import { revokeAllAccess, revokeGrantsWithScope } from '#src/portal/admin/revocation.ts';
import {
  buildHeldRoles,
  byLatestExpiry,
  canManageUser,
  canRemoveRole,
} from '#src/portal/admin/users/policy.ts';
import { assignRole } from '#src/portal/admin/users/roles.ts';
import { DeleteUserPage } from '#src/portal/admin/users/views/delete-user.tsx';
import { type NewUserForm, NewUserPage } from '#src/portal/admin/users/views/new-user.tsx';
import { ResetPasswordPage } from '#src/portal/admin/users/views/reset-password.tsx';
import { TemporaryPasswordPage } from '#src/portal/admin/users/views/temporary-password.tsx';
import { UserDetailPage } from '#src/portal/admin/users/views/user-detail.tsx';
import { UsersListPage } from '#src/portal/admin/users/views/users.tsx';
import { adminUrl, ROUTE } from '#src/portal/paths.ts';
import { resourceRegistry } from '#src/resources/services.ts';
import { buildNewUser, issueTemporaryPassword, parseNewUser } from '#src/users/provision.ts';
import {
  createUser,
  deleteUser,
  getUserByEmail,
  getUserBySub,
  listUsers,
  removeRole,
  setTemporaryPassword,
} from '#src/users/storage/store.ts';
import type { User } from '#src/users/types.ts';

/** Adds the user pages to the admin router, so they sit behind its session and admin checks. */
export function addUserRoutes(router: Router, provider: Provider): void {
  router.get(ROUTE.users, async (ctx) => {
    ctx.type = 'html';
    ctx.body = await UsersListPage({ users: await listUsers() });
  });

  router.get(ROUTE.newUser, async (ctx) => {
    ctx.type = 'html';
    ctx.body = await NewUserPage({});
  });

  router.post(ROUTE.users, async (ctx) => {
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
    ctx.body = await TemporaryPasswordPage({
      mode: 'created',
      user,
      tempPassword,
      expiresAt: user.tempPasswordExpiresAt,
    });
  });

  router.get(ROUTE.user, async (ctx) => {
    const user = ctx.params.sub ? await getUserBySub(ctx.params.sub) : undefined;
    if (!user) {
      ctx.redirect(adminUrl.users());
      return;
    }

    const [sessions, grants, accessTokens] = await Promise.all([
      listSessions(),
      listGrants(),
      listAccessTokens(),
    ]);

    const knownScopes = await resourceRegistry.scopes();

    ctx.type = 'html';
    ctx.body = await UserDetailPage({
      user,
      sessions: sessions.filter((s) => s.accountId === user.sub).sort(byLatestExpiry),
      grants: grants.filter((g) => g.accountId === user.sub).sort(byLatestExpiry),
      accessTokens: accessTokens.filter((t) => t.accountId === user.sub).sort(byLatestExpiry),
      roles: buildHeldRoles(user, ctx.state.user.sub, knownScopes),
      canManage: canManageUser(user, ctx.state.user.sub),
      grantableRoles: knownScopes.filter((role) => !user.roles.includes(role)),
    });
  });

  router.post(ROUTE.addRole, async (ctx) => {
    const { sub } = ctx.params;
    const role = (await readForm(ctx)).get('role');
    if (sub && role && (await resourceRegistry.scopes()).includes(role)) {
      await assignRole(provider, sub, role);
    }
    ctx.redirect(adminUrl.user(sub ?? ''));
  });

  router.post(ROUTE.removeRole, async (ctx) => {
    const user = ctx.params.sub ? await getUserBySub(ctx.params.sub) : undefined;
    if (!user) {
      ctx.redirect(adminUrl.users());
      return;
    }

    const role = (await readForm(ctx)).get('role');
    if (role && canRemoveRole(user, role, ctx.state.user.sub, await resourceRegistry.scopes())) {
      await removeRole(user.sub, role);
      await revokeGrantsWithScope(provider, user.sub, role);
    }
    ctx.redirect(adminUrl.user(user.sub));
  });

  router.get(ROUTE.deleteUser, async (ctx) => {
    const user = await findOtherUser(ctx);
    if (!user) {
      return;
    }

    ctx.type = 'html';
    ctx.body = await DeleteUserPage({ user });
  });

  router.post(ROUTE.deleteUser, async (ctx) => {
    const user = await findOtherUser(ctx);
    if (!user) {
      return;
    }

    await revokeAllAccess(provider, user.sub);
    await deleteUser(user.sub);
    logEvent({ event: 'user_deleted', sub: user.sub, by: ctx.state.user.sub });
    ctx.redirect(adminUrl.users());
  });

  router.get(ROUTE.resetPassword, async (ctx) => {
    const user = await findOtherUser(ctx);
    if (!user) {
      return;
    }

    ctx.type = 'html';
    ctx.body = await ResetPasswordPage({ user });
  });

  router.post(ROUTE.resetPassword, async (ctx) => {
    const user = await findOtherUser(ctx);
    if (!user) {
      return;
    }

    const temp = await issueTemporaryPassword();
    await revokeAllAccess(provider, user.sub);
    await setTemporaryPassword(user.sub, temp);
    logEvent({ event: 'password_reset', sub: user.sub, by: ctx.state.user.sub });

    ctx.set('Cache-Control', 'no-store');
    ctx.type = 'html';
    ctx.body = await TemporaryPasswordPage({
      mode: 'reset',
      user,
      tempPassword: temp.tempPassword,
      expiresAt: temp.expiresAt,
    });
  });
}

/** Loads the user in the URL, or redirects away and returns nothing when they can't be managed. */
async function findOtherUser(ctx: RouterContext): Promise<User | undefined> {
  const user = ctx.params.sub ? await getUserBySub(ctx.params.sub) : undefined;
  if (user && canManageUser(user, ctx.state.user.sub)) {
    return user;
  }
  ctx.redirect(user ? adminUrl.user(user.sub) : adminUrl.users());
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
