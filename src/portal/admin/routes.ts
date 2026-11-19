import Router from '@koa/router';
import type Provider from 'oidc-provider';
import { requireSameOrigin } from '#src/auth/same-origin.ts';
import { clientServices } from '#src/clients/services.ts';
import { resourceRegistry } from '#src/resources/services.ts';
import { addClientRoutes } from '#src/portal/admin/clients/routes.ts';
import { addResourceRoutes } from '#src/portal/admin/resources/routes.ts';
import { addUserRoutes } from '#src/portal/admin/users/routes.ts';
import { DashboardPage } from '#src/portal/admin/views/dashboard.tsx';
import { buildRequirePortalSession, requireAdmin } from '#src/portal/auth/session.ts';
import { ADMIN_PREFIX, ROUTE } from '#src/portal/paths.ts';

export function buildAdminRouter(provider: Provider): Router {
  const router = new Router({ prefix: ADMIN_PREFIX });
  const requirePortalSession = buildRequirePortalSession(provider);

  router.use(requireSameOrigin, requirePortalSession, requireAdmin);

  router.get(ROUTE.dashboard, async (ctx) => {
    ctx.type = 'html';
    ctx.body = await DashboardPage({
      clients: await clientServices.store.list(),
      resources: await resourceRegistry.list(),
    });
  });

  addClientRoutes(router, provider);
  addResourceRoutes(router, provider);
  addUserRoutes(router, provider);

  return router;
}
