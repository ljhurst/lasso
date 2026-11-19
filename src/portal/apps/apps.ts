import { LASSO_RESOURCE_INDICATOR } from '#src/resources/built-in.ts';
import type { ResourceRegistry } from '#src/resources/registry.ts';
import type { Resource } from '#src/resources/types.ts';
import { partitionScopeByRoles } from '#src/users/access.ts';

export interface UserApp {
  indicator: string;
  resource: Resource;
}

/** The resources, other than Lasso itself, that the roles give access to. */
export async function getUserApps(registry: ResourceRegistry, roles: string[]): Promise<UserApp[]> {
  return (await registry.list())
    .filter((resource) => resource.indicator !== LASSO_RESOURCE_INDICATOR)
    .filter((resource) => partitionScopeByRoles(resource.scopes, roles).granted.length > 0)
    .map((resource) => ({ indicator: resource.indicator, resource }));
}
