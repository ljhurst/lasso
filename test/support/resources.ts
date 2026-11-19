import { builtInResources } from '#src/resources/built-in.ts';
import { createResourceRegistry, type ResourceRegistry } from '#src/resources/registry.ts';
import type { ResourceStore } from '#src/resources/storage/store.ts';
import type { ResourceRecord } from '#src/resources/types.ts';

export function makeResource(
  overrides: Partial<ResourceRecord['metadata']> = {},
  app?: ResourceRecord['app'],
): ResourceRecord {
  const metadata = {
    resource: 'https://api.example.com/',
    resource_name: 'Example API',
    scopes_supported: ['example:read', 'example:write'],
    ...overrides,
  };
  return {
    resource: metadata.resource,
    createdAt: '2026-01-01T00:00:00.000Z',
    metadata,
    ...(app && { app }),
  };
}

/** A registry over the resources built into Lasso plus any stored ones, with no table behind it. */
export function registryWithBuiltIns(stored: ResourceRecord[] = []): ResourceRegistry {
  const store: ResourceStore = {
    get: async (resource) => stored.find((record) => record.resource === resource),
    list: async () => stored,
    create: async (record) => void stored.push(record),
    replace: async () => undefined,
    remove: async () => undefined,
  };
  return createResourceRegistry(store, builtInResources);
}
