import { LASSO_ADMIN_SCOPE } from '#src/resources/scopes.ts';
import { env } from '#src/env.ts';
import { seedResources } from '#src/resources/seed.ts';
import type { Resource } from '#src/resources/types.ts';

export const LASSO_RESOURCE_INDICATOR = env.issuer;

/** The resources Lasso serves itself; a stored resource cannot replace one. */
export const builtInResources: Resource[] = [
  ...seedResources.map(
    (seed): Resource => ({
      indicator: seed.resource,
      name: seed.metadata.resource_name,
      scopes: seed.metadata.scopes_supported,
      app: seed.app,
      builtIn: true,
    }),
  ),
  {
    indicator: LASSO_RESOURCE_INDICATOR,
    name: 'Lasso Admin',
    scopes: [LASSO_ADMIN_SCOPE],
    builtIn: true,
  },
];
