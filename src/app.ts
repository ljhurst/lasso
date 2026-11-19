import Provider from 'oidc-provider';

import { originGuard } from '#src/auth/origin-verify.ts';
import { getParameter } from '#src/aws/ssm.ts';
import { buildConfiguration } from '#src/config/index.ts';
import { env } from '#src/env.ts';
import { buildInteractionRouter } from '#src/interactions/routes.ts';
import type { RequestHandler } from '#src/live-app.ts';
import { attachProviderEvents } from '#src/observability/provider-events.ts';
import { requestLog } from '#src/observability/request-log.ts';
import { buildAdminRouter } from '#src/portal/admin/routes.ts';
import { buildAppsRouter } from '#src/portal/apps/routes.ts';
import { buildPortalRouter, buildRootRouter } from '#src/portal/routes.ts';
import type { ResourceRegistry } from '#src/resources/registry.ts';

/** A provider with every router mounted behind the origin guard, configured for the resources registered right now. */
export async function buildApp(
  registry: ResourceRegistry,
): Promise<{ handler: RequestHandler; version: string }> {
  const scopes = await registry.scopes();
  const configuration = await buildConfiguration(registry, scopes);
  const provider = new Provider(env.issuer, configuration);

  provider.proxy = true;

  attachProviderEvents(provider);
  provider.use(requestLog());

  if (env.originVerifySsmParam) {
    provider.use(originGuard(await getParameter(env.originVerifySsmParam)));
  }

  const interactions = buildInteractionRouter(provider);
  provider.use(interactions.routes());
  provider.use(interactions.allowedMethods());

  const root = buildRootRouter();
  provider.use(root.routes());
  provider.use(root.allowedMethods());

  const portal = buildPortalRouter(provider);
  provider.use(portal.routes());
  provider.use(portal.allowedMethods());

  const apps = buildAppsRouter(provider);
  provider.use(apps.routes());
  provider.use(apps.allowedMethods());

  const admin = buildAdminRouter(provider);
  provider.use(admin.routes());
  provider.use(admin.allowedMethods());

  return { handler: provider.callback(), version: scopes.join(' ') };
}
