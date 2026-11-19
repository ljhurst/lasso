import type Router from '@koa/router';
import type { RouterContext } from '@koa/router';
import type Provider from 'oidc-provider';
import { clientServices } from '#src/clients/services.ts';
import { parseClientEdits, parseNewClient } from '#src/clients/form.ts';
import {
  changeClientScopes,
  registerClient,
  removeClient,
  updateClient,
} from '#src/clients/register.ts';
import { type ClientRecord, clientTypeOf, scopesOf } from '#src/clients/types.ts';
import { readForm } from '#src/form-body.ts';
import { logEvent } from '#src/observability/events.ts';
import { ClientDetailPage } from '#src/portal/admin/clients/views/client-detail.tsx';
import { ClientSecretPage } from '#src/portal/admin/clients/views/client-secret.tsx';
import { DeleteClientPage } from '#src/portal/admin/clients/views/delete-client.tsx';
import { NewClientPage } from '#src/portal/admin/clients/views/new-client.tsx';
import { assignableClientScopes, canManageClient } from '#src/portal/admin/clients/policy.ts';
import { revokeClientAccess } from '#src/portal/admin/revocation.ts';
import { adminUrl, ROUTE } from '#src/portal/paths.ts';
import { resourceRegistry } from '#src/resources/services.ts';

const DELETE_FAILED =
  "Couldn't delete this client. Nothing that can't be retried was removed; try again.";

async function assignableScopes(): Promise<string[]> {
  return assignableClientScopes(await resourceRegistry.scopes());
}

/** Adds the client pages to the admin router, so they sit behind its session and admin checks. */
export function addClientRoutes(router: Router, provider: Provider): void {
  router.get(ROUTE.newClient, async (ctx) => {
    ctx.type = 'html';
    ctx.body = await NewClientPage({ scopeChoices: await assignableScopes() });
  });

  router.post(ROUTE.clients, async (ctx) => {
    const input = parseNewClient(await readForm(ctx));
    const assignable = await assignableScopes();
    const result = await registerClient(clientServices, input, assignable);
    if ('error' in result) {
      ctx.status = 400;
      ctx.type = 'html';
      ctx.body = await NewClientPage({
        scopeChoices: assignable,
        error: result.error,
        values: input,
      });
      return;
    }

    logEvent({ event: 'client_created', clientId: result.client.clientId, by: ctx.state.user.sub });
    if (result.secret === undefined) {
      ctx.redirect(adminUrl.client(result.client.clientId));
      return;
    }

    ctx.set('Cache-Control', 'no-store');
    ctx.type = 'html';
    ctx.body = await ClientSecretPage({ client: result.client, secret: result.secret });
  });

  router.get(ROUTE.client, async (ctx) => {
    const client = await findClient(ctx);
    if (!client) {
      return;
    }

    ctx.type = 'html';
    ctx.body = await ClientDetailPage({
      client,
      grantableScopes: await grantableScopes(client),
      canManage: canManageClient(client.clientId),
    });
  });

  router.post(ROUTE.client, async (ctx) => {
    const client = await findManagedClient(ctx);
    if (!client) {
      return;
    }

    const edits = parseClientEdits(await readForm(ctx));
    const result = await updateClient(
      clientServices,
      client.clientId,
      edits,
      await assignableScopes(),
    );
    if ('error' in result) {
      ctx.status = 400;
      ctx.type = 'html';
      ctx.body = await ClientDetailPage({
        client,
        grantableScopes: await grantableScopes(client),
        canManage: true,
        error: result.error,
        values: edits,
      });
      return;
    }

    logEvent({ event: 'client_updated', clientId: client.clientId, by: ctx.state.user.sub });
    ctx.type = 'html';
    ctx.body = await ClientDetailPage({
      client: result.client,
      grantableScopes: await grantableScopes(result.client),
      canManage: true,
      saved: true,
    });
  });

  router.post(ROUTE.addClientScope, async (ctx) => {
    const client = await findManagedClient(ctx);
    if (!client) {
      return;
    }

    const scope = (await readForm(ctx)).get('scope');
    if (scope && (await grantableScopes(client)).includes(scope)) {
      await saveScopes(ctx, client, [...scopesOf(client.metadata), scope]);
    }
    ctx.redirect(adminUrl.client(client.clientId));
  });

  router.post(ROUTE.removeClientScope, async (ctx) => {
    const client = await findManagedClient(ctx);
    if (!client) {
      return;
    }

    const held = scopesOf(client.metadata);
    const scope = (await readForm(ctx)).get('scope');
    if (scope && held.length > 1 && held.includes(scope)) {
      const saved = await saveScopes(
        ctx,
        client,
        held.filter((item) => item !== scope),
      );
      if (saved) {
        await revokeClientAccess(provider, client.clientId);
      }
    }
    ctx.redirect(adminUrl.client(client.clientId));
  });

  router.get(ROUTE.deleteClient, async (ctx) => {
    const client = await findManagedClient(ctx);
    if (!client) {
      return;
    }

    ctx.type = 'html';
    ctx.body = await DeleteClientPage({ client });
  });

  router.post(ROUTE.deleteClient, async (ctx) => {
    const client = await findManagedClient(ctx);
    if (!client) {
      return;
    }

    try {
      await removeClient(clientServices, client.clientId);
    } catch (error) {
      logEvent({
        event: 'client_delete_failed',
        clientId: client.clientId,
        by: ctx.state.user.sub,
        error: error instanceof Error ? error.name : 'unknown',
      });
      ctx.status = 500;
      ctx.type = 'html';
      ctx.body = await DeleteClientPage({ client, error: DELETE_FAILED });
      return;
    }

    logEvent({ event: 'client_deleted', clientId: client.clientId, by: ctx.state.user.sub });
    await revokeClientAccess(provider, client.clientId);
    ctx.redirect(adminUrl.dashboard());
  });
}

/** Scopes a confidential client could still be given; none for a public client. */
async function grantableScopes(client: ClientRecord): Promise<string[]> {
  if (clientTypeOf(client.metadata) === 'public') {
    return [];
  }
  const held = scopesOf(client.metadata);
  return (await assignableScopes()).filter((scope) => !held.includes(scope));
}

async function saveScopes(
  ctx: RouterContext,
  client: ClientRecord,
  scopes: string[],
): Promise<boolean> {
  const result = await changeClientScopes(
    clientServices,
    client.clientId,
    scopes,
    await assignableScopes(),
  );
  if ('error' in result) {
    return false;
  }
  logEvent({ event: 'client_updated', clientId: client.clientId, by: ctx.state.user.sub });
  return true;
}

/** Loads the client in the URL, or redirects to the dashboard and returns nothing when it doesn't exist. */
async function findClient(ctx: RouterContext): Promise<ClientRecord | undefined> {
  const client = ctx.params.clientId
    ? await clientServices.store.get(ctx.params.clientId)
    : undefined;
  if (!client) {
    ctx.redirect(adminUrl.dashboard());
  }
  return client;
}

/** Like findClient, but sends the portal's own client back to its page, since changing it would lock admins out. */
async function findManagedClient(ctx: RouterContext): Promise<ClientRecord | undefined> {
  const client = await findClient(ctx);
  if (client && !canManageClient(client.clientId)) {
    ctx.redirect(adminUrl.client(client.clientId));
    return undefined;
  }
  return client;
}
