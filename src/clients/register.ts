import { randomBytes } from 'node:crypto';
import type { SecretStore } from '#src/clients/secrets.ts';
import type { ClientStore } from '#src/clients/storage/store.ts';
import {
  type ApplicationType,
  AuthMethod,
  type ClientRecord,
  GrantType,
} from '#src/clients/types.ts';
import { secretSsmParamFor, validateClient } from '#src/clients/validate.ts';

export interface ClientServices {
  store: ClientStore;
  secrets: SecretStore;
}

export type ClientKind = 'app' | 'service';

export interface ClientEdits {
  name: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  scopes: string[];
}

export interface NewClientInput extends ClientEdits {
  clientId: string;
  kind: ClientKind;
  applicationType: ApplicationType;
}

/** The stored client, plus its secret when one was generated; the secret is never kept anywhere readable. */
export type ClientResult = { client: ClientRecord; secret?: string } | { error: string };

const CLIENT_NOT_FOUND = 'That client no longer exists.';
const CLIENT_EXISTS = 'A client with that ID already exists.';

/** Creates a client; a service client also gets a fresh secret, returned once. */
export async function registerClient(
  services: ClientServices,
  input: NewClientInput,
  knownScopes: readonly string[],
  now = new Date(),
): Promise<ClientResult> {
  const client = buildClient(input, now);
  const problem = validateClient(client, knownScopes);
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
  if (!client.secretSsmParam) {
    return { client };
  }

  const secret = randomBytes(32).toString('base64url');
  try {
    await services.secrets.put(client.secretSsmParam, secret);
  } catch (error) {
    await services.store.remove(client.clientId);
    throw error;
  }
  return { client, secret };
}

/** Changes what a client may be used for. Its ID, kind and secret never change. */
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

  const isService = Boolean(existing.secretSsmParam);
  const client: ClientRecord = {
    ...existing,
    name: edits.name,
    redirectUris: isService ? [] : edits.redirectUris,
    postLogoutRedirectUris: isService ? [] : edits.postLogoutRedirectUris,
    scope: isService ? edits.scopes.join(' ') : undefined,
  };
  const problem = validateClient(client, knownScopes);
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

/** Deletes the client first so no new token can be issued, then its secret. */
export async function removeClient(services: ClientServices, clientId: string): Promise<void> {
  const existing = await services.store.get(clientId);
  if (!existing) {
    return;
  }
  await services.store.remove(clientId);
  if (existing.secretSsmParam) {
    await services.secrets.remove(existing.secretSsmParam);
  }
}

function buildClient(input: NewClientInput, now: Date): ClientRecord {
  const base = {
    clientId: input.clientId,
    name: input.name,
    createdAt: now.toISOString(),
  };

  if (input.kind === 'service') {
    return {
      ...base,
      authMethod: AuthMethod.SecretBasic,
      grantTypes: [GrantType.ClientCredentials],
      redirectUris: [],
      postLogoutRedirectUris: [],
      scope: input.scopes.join(' '),
      secretSsmParam: secretSsmParamFor(input.clientId),
    };
  }
  return {
    ...base,
    authMethod: AuthMethod.None,
    grantTypes: [GrantType.AuthorizationCode, GrantType.RefreshToken],
    redirectUris: input.redirectUris,
    postLogoutRedirectUris: input.postLogoutRedirectUris,
    applicationType: input.applicationType,
  };
}

function isConditionFailure(error: unknown): boolean {
  return (error as { name?: string }).name === 'ConditionalCheckFailedException';
}
