import { builtInResources } from '#src/resources/built-in.ts';
import { createResourceRegistry, type ResourceRegistry } from '#src/resources/registry.ts';
import type { ResourceStore } from '#src/resources/storage/store.ts';
import type { ResourceRecord } from '#src/resources/types.ts';

export function makeResource(
  overrides: { resource?: string; resource_name?: string; scopes_supported?: string[] } = {},
  app?: ResourceRecord['app'],
): ResourceRecord {
  const { resource = 'https://api.example.com/', ...rest } = overrides;
  return {
    resource,
    createdAt: '2026-01-01T00:00:00.000Z',
    metadata: {
      resource_name: 'Example API',
      scopes_supported: ['example:read', 'example:write'],
      ...rest,
    },
    ...(app && { app }),
  };
}

/** Stored resources shaped like the ones Lasso runs with, for tests that need real-looking scopes. */
export const SAMPLE_RESOURCES: ResourceRecord[] = [
  makeResource(
    {
      resource: 'https://porto.example.com/',
      resource_name: 'Porto',
      scopes_supported: ['porto:read', 'porto:write'],
    },
    { type: 'mcp', url: 'https://porto.example.com/mcp' },
  ),
  makeResource(
    {
      resource: 'https://victoria.example.com/',
      resource_name: 'Victoria',
      scopes_supported: ['victoria:read', 'victoria:write'],
    },
    { type: 'mcp', url: 'https://victoria.example.com/mcp' },
  ),
  makeResource(
    {
      resource: 'https://viewer.example.com/',
      resource_name: 'Victoria Viewer',
      scopes_supported: ['victoria:read'],
    },
    { type: 'web', url: 'https://viewer.example.com/' },
  ),
  makeResource(
    {
      resource: 'https://fife-api.example.com/',
      resource_name: 'Fife',
      scopes_supported: ['fife:read', 'fife:write', 'fife:admin'],
    },
    { type: 'web', url: 'https://fife.example.com/' },
  ),
  makeResource(
    {
      resource: 'https://freal-api.example.com/',
      resource_name: 'Freal',
      scopes_supported: ['freal:read', 'freal:connect', 'freal:admin'],
    },
    { type: 'web', url: 'https://freal.example.com/' },
  ),
];

/** A registry over the resources built into Lasso plus the stored ones given, with no table behind it. */
export function registryWithBuiltIns(
  stored: ResourceRecord[] = SAMPLE_RESOURCES,
): ResourceRegistry {
  const store: ResourceStore = {
    get: async (resource) => stored.find((record) => record.resource === resource),
    list: async () => stored,
    create: async (record) => void stored.push(record),
    replace: async () => undefined,
    remove: async () => undefined,
  };
  return createResourceRegistry(store, builtInResources);
}
