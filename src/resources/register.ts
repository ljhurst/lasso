import type { ResourceStore } from '#src/resources/storage/store.ts';
import type { AppType, ResourceApp, ResourceRecord } from '#src/resources/types.ts';
import { validateResource } from '#src/resources/validate.ts';

export interface ResourceServices {
  store: ResourceStore;
  /** What Lasso owns and no resource may claim: its own resource indicator and scopes. */
  reserved: { scopes: readonly string[]; resources: readonly string[] };
  /** The scopes clients currently hold, so a scope a client depends on is never taken away. */
  scopesHeldByClients: () => Promise<ReadonlySet<string>>;
}

export interface ResourceEdits {
  name: string;
  scopes: string[];
  appType: AppType | undefined;
  appUrl: string;
}

export interface NewResourceInput extends ResourceEdits {
  resource: string;
}

export type ResourceResult = { record: ResourceRecord } | { error: string };

const NOT_FOUND = 'That resource no longer exists.';
const EXISTS = 'A resource with that indicator already exists.';

export async function registerResource(
  services: ResourceServices,
  input: NewResourceInput,
  now = new Date(),
): Promise<ResourceResult> {
  const record: ResourceRecord = {
    resource: input.resource,
    createdAt: now.toISOString(),
    metadata: {
      resource: input.resource,
      resource_name: input.name,
      scopes_supported: input.scopes,
    },
    ...appField(input),
  };
  const problem = validateResource(record.metadata, record.app, services.reserved);
  if (problem) {
    return { error: problem };
  }
  if (await services.store.get(record.resource)) {
    return { error: EXISTS };
  }

  try {
    await services.store.create(record);
  } catch (error) {
    if (isConditionFailure(error)) {
      return { error: EXISTS };
    }
    throw error;
  }
  return { record };
}

/** Changes a resource's name, scopes and app link; its indicator never changes. */
export async function updateResource(
  services: ResourceServices,
  resource: string,
  edits: ResourceEdits,
): Promise<ResourceResult> {
  const existing = await services.store.get(resource);
  if (!existing) {
    return { error: NOT_FOUND };
  }

  const record: ResourceRecord = {
    resource: existing.resource,
    createdAt: existing.createdAt,
    metadata: { ...existing.metadata, resource_name: edits.name, scopes_supported: edits.scopes },
    ...appField(edits, existing.app),
  };
  const problem = validateResource(record.metadata, record.app, services.reserved);
  if (problem) {
    return { error: problem };
  }

  const removed = existing.metadata.scopes_supported.filter(
    (scope) => !edits.scopes.includes(scope),
  );
  const needed = await scopesInUse(services, existing.resource, removed);
  if (needed) {
    return { error: `A client still holds the scope ${needed}. Remove it from that client first.` };
  }

  try {
    await services.store.replace(record);
  } catch (error) {
    if (isConditionFailure(error)) {
      return { error: NOT_FOUND };
    }
    throw error;
  }
  return { record };
}

/** Removes a resource unless a client holds a scope that only it offers. */
export async function removeResource(
  services: ResourceServices,
  resource: string,
): Promise<ResourceResult> {
  const existing = await services.store.get(resource);
  if (!existing) {
    return { error: NOT_FOUND };
  }
  const needed = await scopesInUse(services, resource, existing.metadata.scopes_supported);
  if (needed) {
    return { error: `A client still holds the scope ${needed}. Remove it from that client first.` };
  }
  await services.store.remove(resource);
  return { record: existing };
}

/** The first of `scopes` that a client holds and no other resource offers. */
async function scopesInUse(
  services: ResourceServices,
  resource: string,
  scopes: string[],
): Promise<string | undefined> {
  if (scopes.length === 0) {
    return undefined;
  }
  const offeredElsewhere = new Set(
    (await services.store.list())
      .filter((record) => record.resource !== resource)
      .flatMap((record) => record.metadata.scopes_supported),
  );
  const held = await services.scopesHeldByClients();
  return scopes.find((scope) => held.has(scope) && !offeredElsewhere.has(scope));
}

function appField(
  edits: Pick<ResourceEdits, 'appType' | 'appUrl'>,
  existing?: ResourceApp,
): { app?: ResourceApp } {
  if (!edits.appType) {
    return {};
  }
  return {
    app: {
      type: edits.appType,
      ...(edits.appUrl && { url: edits.appUrl }),
      ...(existing?.logo && { logo: existing.logo }),
    },
  };
}

function isConditionFailure(error: unknown): boolean {
  return (error as { name?: string }).name === 'ConditionalCheckFailedException';
}
