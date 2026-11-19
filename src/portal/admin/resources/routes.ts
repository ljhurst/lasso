import type Router from '@koa/router';
import type { RouterContext } from '@koa/router';
import type Provider from 'oidc-provider';
import { readForm } from '#src/form-body.ts';
import { logEvent } from '#src/observability/events.ts';
import { DeleteResourcePage } from '#src/portal/admin/resources/views/delete-resource.tsx';
import { NewResourcePage } from '#src/portal/admin/resources/views/new-resource.tsx';
import { ResourceDetailPage } from '#src/portal/admin/resources/views/resource-detail.tsx';
import { resourceServices } from '#src/portal/admin/resources/services.ts';
import { revokeResourceAccess, revokeResourceScopes } from '#src/portal/admin/revocation.ts';
import { adminUrl, ROUTE } from '#src/portal/paths.ts';
import { resourcesChanged } from '#src/resources/changes.ts';
import { parseNewResource, parseResourceEdits } from '#src/resources/form.ts';
import { indicatorFromId, resourceId } from '#src/resources/id.ts';
import { registerResource, removeResource, updateResource } from '#src/resources/register.ts';
import { resourceRegistry, resourceStore } from '#src/resources/services.ts';
import { type Resource, toResource } from '#src/resources/types.ts';

/** Adds the resource pages to the admin router, so they sit behind its session and admin checks. */
export function addResourceRoutes(router: Router, provider: Provider): void {
  router.get(ROUTE.newResource, async (ctx) => {
    ctx.type = 'html';
    ctx.body = await NewResourcePage({});
  });

  router.post(ROUTE.resources, async (ctx) => {
    const input = parseNewResource(await readForm(ctx));
    const result = await registerResource(resourceServices, input);
    if ('error' in result) {
      ctx.status = 400;
      ctx.type = 'html';
      ctx.body = await NewResourcePage({ error: result.error, values: input });
      return;
    }

    logEvent({ event: 'resource_created', resource: input.resource, by: ctx.state.user.sub });
    resourcesChanged();
    ctx.redirect(adminUrl.resource(resourceId(result.record.resource)));
  });

  router.get(ROUTE.resource, async (ctx) => {
    const resource = await findResource(ctx);
    if (!resource) {
      return;
    }
    const record = resource.builtIn ? undefined : await resourceStore.get(resource.indicator);

    ctx.type = 'html';
    ctx.body = await ResourceDetailPage({ resource, createdAt: record?.createdAt });
  });

  router.post(ROUTE.resource, async (ctx) => {
    const resource = await findStoredResource(ctx);
    if (!resource) {
      return;
    }

    const edits = parseResourceEdits(await readForm(ctx));
    const result = await updateResource(resourceServices, resource.indicator, edits);
    if ('error' in result) {
      ctx.status = 400;
      ctx.type = 'html';
      ctx.body = await ResourceDetailPage({ resource, error: result.error, values: edits });
      return;
    }

    logEvent({ event: 'resource_updated', resource: resource.indicator, by: ctx.state.user.sub });
    resourcesChanged();
    const removed = resource.scopes.filter((scope) => !edits.scopes.includes(scope));
    if (removed.length > 0) {
      await revokeResourceScopes(provider, resource.indicator, removed);
    }

    ctx.type = 'html';
    ctx.body = await ResourceDetailPage({
      resource: toResource(result.record),
      createdAt: result.record.createdAt,
      saved: true,
    });
  });

  router.get(ROUTE.deleteResource, async (ctx) => {
    const resource = await findStoredResource(ctx);
    if (!resource) {
      return;
    }

    ctx.type = 'html';
    ctx.body = await DeleteResourcePage({ resource });
  });

  router.post(ROUTE.deleteResource, async (ctx) => {
    const resource = await findStoredResource(ctx);
    if (!resource) {
      return;
    }

    const result = await removeResource(resourceServices, resource.indicator);
    if ('error' in result) {
      ctx.status = 400;
      ctx.type = 'html';
      ctx.body = await DeleteResourcePage({ resource, error: result.error });
      return;
    }

    logEvent({ event: 'resource_deleted', resource: resource.indicator, by: ctx.state.user.sub });
    resourcesChanged();
    await revokeResourceAccess(provider, resource.indicator);
    ctx.redirect(adminUrl.dashboard());
  });
}

/** Loads the resource named in the URL, or redirects to the dashboard and returns nothing when there is none. */
async function findResource(ctx: RouterContext): Promise<Resource | undefined> {
  const indicator = indicatorFromId(ctx.params.resource ?? '');
  const resource = indicator ? await resourceRegistry.get(indicator) : undefined;
  if (!resource) {
    ctx.redirect(adminUrl.dashboard());
  }
  return resource;
}

/** Like findResource, but sends a built-in resource back to its page, since Lasso serves it itself. */
async function findStoredResource(ctx: RouterContext): Promise<Resource | undefined> {
  const resource = await findResource(ctx);
  if (resource?.builtIn) {
    ctx.redirect(adminUrl.resource(resourceId(resource.indicator)));
    return undefined;
  }
  return resource;
}
