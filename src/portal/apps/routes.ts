import Router from '@koa/router';
import type Provider from 'oidc-provider';
import {
  LASSO_RESOURCE_INDICATOR,
  type NamedResourceServer,
  resources,
} from '../../config/resources.ts';
import { filterGrantedScope } from '../../interactions/routes.ts';
import type { User } from '../../users/types.ts';
import { buildRequirePortalSession } from '../auth/session.ts';
import { DashboardPage } from './views/dashboard.tsx';

export interface UserApp {
  indicator: string;
  resource: NamedResourceServer;
}

export function getUserApps(roles: string[]): UserApp[] {
  return Object.entries(resources)
    .filter(([indicator]) => indicator !== LASSO_RESOURCE_INDICATOR)
    .filter(
      ([, resource]) => filterGrantedScope(resource.scope?.split(' ') ?? [], roles).length > 0,
    )
    .map(([indicator, resource]) => ({ indicator, resource }));
}

export function buildAppsRouter(provider: Provider): Router {
  const router = new Router({ prefix: '/apps' });
  const requirePortalSession = buildRequirePortalSession(provider);

  router.get('/', requirePortalSession, async (ctx) => {
    const user = ctx.state.user as User;
    const isAdmin = ctx.state.isAdmin as boolean;

    ctx.type = 'html';
    ctx.body = await DashboardPage({ apps: getUserApps(user.roles), isAdmin });
  });

  return router;
}
