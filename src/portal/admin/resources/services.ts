import { clientServices } from '#src/clients/services.ts';
import { scopesOf } from '#src/clients/types.ts';
import { LASSO_RESOURCE_INDICATOR } from '#src/resources/built-in.ts';
import type { ResourceServices } from '#src/resources/register.ts';
import { LASSO_ADMIN_SCOPE } from '#src/resources/scopes.ts';
import { resourceStore } from '#src/resources/services.ts';

export const resourceServices: ResourceServices = {
  store: resourceStore,
  reserved: { scopes: [LASSO_ADMIN_SCOPE], resources: [LASSO_RESOURCE_INDICATOR] },
  scopesHeldByClients: async () =>
    new Set((await clientServices.store.list()).flatMap((client) => scopesOf(client.metadata))),
};
