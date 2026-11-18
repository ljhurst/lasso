import {
  LASSO_RESOURCE_INDICATOR,
  type NamedResourceServer,
  resources,
} from '#src/config/resources.ts';
import { partitionScopeByRoles } from '#src/users/access.ts';

export interface UserApp {
  indicator: string;
  resource: NamedResourceServer;
}

export function getUserApps(roles: string[]): UserApp[] {
  return Object.entries(resources)
    .filter(([indicator]) => indicator !== LASSO_RESOURCE_INDICATOR)
    .filter(
      ([, resource]) =>
        partitionScopeByRoles(resource.scope?.split(' ') ?? [], roles).granted.length > 0,
    )
    .map(([indicator, resource]) => ({ indicator, resource }));
}
