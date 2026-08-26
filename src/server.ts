import { createServer } from 'node:http';

import Provider from 'oidc-provider';

import { buildConfiguration } from '#src/config/index.ts';
import { env } from '#src/env.ts';
import { buildInteractionRouter } from '#src/interactions/routes.ts';
import { buildAdminRouter } from '#src/portal/admin/routes.ts';
import { buildAppsRouter } from '#src/portal/apps/routes.ts';
import { buildPortalRouter } from '#src/portal/routes.ts';

async function main(): Promise<void> {
  const configuration = await buildConfiguration();
  const provider = new Provider(env.issuer, configuration);

  provider.proxy = true;

  const interactions = buildInteractionRouter(provider);
  provider.use(interactions.routes());
  provider.use(interactions.allowedMethods());

  const portal = buildPortalRouter(provider);
  provider.use(portal.routes());
  provider.use(portal.allowedMethods());

  const apps = buildAppsRouter(provider);
  provider.use(apps.routes());
  provider.use(apps.allowedMethods());

  const admin = buildAdminRouter(provider);
  provider.use(admin.routes());
  provider.use(admin.allowedMethods());

  createServer(provider.callback()).listen(env.port, () => {
    console.log(`lasso listening on :${env.port}`);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
