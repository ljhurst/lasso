import { randomToken } from '#src/auth/random.ts';
import { secretParamFor } from '#src/clients/secret-param.ts';
import type { SecretStore } from '#src/clients/secrets.ts';
import type { ClientStore } from '#src/clients/storage/store.ts';
import {
  type ApplicationType,
  type ClientRecord,
  type ClientType,
  clientTypeOf,
  type RegisteredClient,
} from '#src/clients/types.ts';
import { validateClient } from '#src/clients/validate.ts';

export interface ClientServices {
  store: ClientStore;
  secrets: SecretStore;
}

export interface ClientEdits {
  name: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  scopes: string[];
}

export interface NewClientInput extends ClientEdits {
  clientId: string;
  clientType: ClientType;
  applicationType: ApplicationType;
}

/** The stored client, plus its secret when one was generated; the secret is never kept anywhere readable. */
export type ClientResult = { client: ClientRecord; secret?: string } | { error: string };

const CLIENT_NOT_FOUND = 'That client no longer exists.';
const CLIENT_EXISTS = 'A client with that ID already exists.';

/** Creates a client; a confidential client also gets a fresh secret, returned once. */
export async function registerClient(
  services: ClientServices,
  input: NewClientInput,
  knownScopes: readonly string[],
  now = new Date(),
): Promise<ClientResult> {
  const client: ClientRecord = {
    clientId: input.clientId,
    createdAt: now.toISOString(),
    metadata: buildMetadata(input),
  };
  const problem = validateClient(client.metadata, knownScopes);
  if (problem) {
    return { error: problem };
  }
  if (await services.store.get(client.clientId)) {
    return { error: CLIENT_EXISTS };
  }

  try {
    await services.store.create(client);
  } catch (error) {
    if (isConditionFailure(error)) {
      return { error: CLIENT_EXISTS };
    }
    throw error;
  }
  if (clientTypeOf(client.metadata) === 'public') {
    return { client };
  }

  const secret = randomToken();
  try {
    await services.secrets.put(secretParamFor(client.clientId), secret);
  } catch (error) {
    await services.store.remove(client.clientId);
    throw error;
  }
  return { client, secret };
}

/** Changes what a client may be used for. Its ID, type, grants and secret never change. */
export async function updateClient(
  services: ClientServices,
  clientId: string,
  edits: ClientEdits,
  knownScopes: readonly string[],
): Promise<ClientResult> {
  const existing = await services.store.get(clientId);
  if (!existing) {
    return { error: CLIENT_NOT_FOUND };
  }

  const { redirect_uris, post_logout_redirect_uris, scope, ...kept } = existing.metadata;
  const isPublic = clientTypeOf(existing.metadata) === 'public';
  const client: ClientRecord = {
    ...existing,
    metadata: {
      ...kept,
      client_name: edits.name,
      ...(isPublic ? uriFields(edits) : { scope: edits.scopes.join(' ') }),
    },
  };
  const problem = validateClient(client.metadata, knownScopes);
  if (problem) {
    return { error: problem };
  }

  try {
    await services.store.replace(client);
  } catch (error) {
    if (isConditionFailure(error)) {
      return { error: CLIENT_NOT_FOUND };
    }
    throw error;
  }
  return { client };
}

/** Replaces a confidential client's scopes, keeping everything else as it is. */
export async function changeClientScopes(
  services: ClientServices,
  clientId: string,
  scopes: string[],
  knownScopes: readonly string[],
): Promise<ClientResult> {
  const existing = await services.store.get(clientId);
  if (!existing) {
    return { error: CLIENT_NOT_FOUND };
  }
  const { metadata } = existing;
  return updateClient(
    services,
    clientId,
    {
      name: metadata.client_name,
      redirectUris: metadata.redirect_uris ?? [],
      postLogoutRedirectUris: metadata.post_logout_redirect_uris ?? [],
      scopes,
    },
    knownScopes,
  );
}

/**
 * Deletes the secret before the row: if the secret cannot be deleted nothing
 * has changed, and if the row then fails the client has no secret to
 * authenticate with and the delete can be retried.
 */
export async function removeClient(services: ClientServices, clientId: string): Promise<void> {
  const existing = await services.store.get(clientId);
  if (!existing) {
    return;
  }
  if (clientTypeOf(existing.metadata) === 'confidential') {
    await services.secrets.remove(secretParamFor(clientId));
  }
  await services.store.remove(clientId);
}

function buildMetadata(input: NewClientInput): RegisteredClient {
  const base = { client_id: input.clientId, client_name: input.name };

  if (input.clientType === 'confidential') {
    return {
      ...base,
      token_endpoint_auth_method: 'client_secret_basic',
      grant_types: ['client_credentials'],
      response_types: [],
      scope: input.scopes.join(' '),
    };
  }
  return {
    ...base,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: input.applicationType,
    ...uriFields(input),
  };
}

function uriFields(
  edits: ClientEdits,
): Pick<RegisteredClient, 'redirect_uris' | 'post_logout_redirect_uris'> {
  return {
    redirect_uris: edits.redirectUris,
    ...(edits.postLogoutRedirectUris.length > 0 && {
      post_logout_redirect_uris: edits.postLogoutRedirectUris,
    }),
  };
}

function isConditionFailure(error: unknown): boolean {
  return (error as { name?: string }).name === 'ConditionalCheckFailedException';
}
