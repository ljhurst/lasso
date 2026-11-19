import Router from '@koa/router';
import type Provider from 'oidc-provider';
import { getUserApps } from '#src/portal/apps/apps.ts';
import { resourceRegistry } from '#src/resources/services.ts';
import type { User } from '#src/users/types.ts';
import { buildRequirePortalSession } from '#src/portal/auth/session.ts';
import { DashboardPage } from '#src/portal/apps/views/dashboard.tsx';
import { APPS_URL } from '#src/portal/paths.ts';

export function buildAppsRouter(provider: Provider): Router {
  const router = new Router({ prefix: APPS_URL });
  const requirePortalSession = buildRequirePortalSession(provider);

  router.get('/', requirePortalSession, async (ctx) => {
    const user = ctx.state.user as User;
    const isAdmin = ctx.state.isAdmin as boolean;

    ctx.type = 'html';
    ctx.body = await DashboardPage({
      apps: await getUserApps(resourceRegistry, user.roles),
      isAdmin,
    });
  });

  return router;
}
