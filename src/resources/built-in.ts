import { env } from '#src/env.ts';
import type { Resource } from '#src/resources/types.ts';
import { LASSO_ADMIN_SCOPE } from '#src/resources/scopes.ts';

export const LASSO_RESOURCE_INDICATOR = env.issuer;

/** The resources Lasso serves itself; a stored resource cannot replace one. */
export const builtInResources: Resource[] = [
  {
    indicator: LASSO_RESOURCE_INDICATOR,
    name: 'Lasso Admin',
    scopes: [LASSO_ADMIN_SCOPE],
    builtIn: true,
  },
];
