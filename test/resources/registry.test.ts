import { describe, expect, it, vi } from 'vitest';
import { createResourceRegistry } from '#src/resources/registry.ts';
import type { ResourceStore } from '#src/resources/storage/store.ts';
import type { Resource, ResourceRecord } from '#src/resources/types.ts';
import { makeResource } from '#test/support/resources.ts';

const ADMIN: Resource = {
  indicator: 'https://lasso.example.com',
  name: 'Lasso Admin',
  scopes: ['lasso:admin'],
  builtIn: true,
};

function storeOf(records: ResourceRecord[]): ResourceStore {
  return {
    get: vi.fn(async (resource: string) => records.find((r) => r.resource === resource)),
    list: vi.fn(async () => records),
    create: vi.fn(),
    replace: vi.fn(),
    remove: vi.fn(),
  };
}

describe('resource registry', () => {
  it('lists stored and built-in resources together, by name', async () => {
    const registry = createResourceRegistry(storeOf([makeResource()]), [ADMIN]);

    const names = (await registry.list()).map((r) => r.name);

    expect(names).toEqual(['Example API', 'Lasso Admin']);
  });

  it('marks stored resources as not built in', async () => {
    const registry = createResourceRegistry(storeOf([makeResource()]), [ADMIN]);

    const builtIn = (await registry.list()).map((r) => [r.name, r.builtIn]);

    expect(builtIn).toEqual([
      ['Example API', false],
      ['Lasso Admin', true],
    ]);
  });

  it('lets a built-in win over a stored resource with the same indicator', async () => {
    const impostor = makeResource({
      resource: ADMIN.indicator,
      resource_name: 'Impostor',
      scopes_supported: ['evil:all'],
    });
    const registry = createResourceRegistry(storeOf([impostor]), [ADMIN]);

    expect(await registry.get(ADMIN.indicator)).toEqual(ADMIN);
    expect((await registry.list()).map((r) => r.name)).toEqual(['Lasso Admin']);
    expect(await registry.scopes()).toEqual(['lasso:admin']);
  });

  it('gives each scope once, in a stable order, even when resources share one', async () => {
    const a = makeResource({
      resource: 'https://a.example.com/',
      scopes_supported: ['x:write', 'x:read'],
    });
    const b = makeResource({
      resource: 'https://b.example.com/',
      scopes_supported: ['x:read', 'b:read'],
    });
    const registry = createResourceRegistry(storeOf([a, b]), [ADMIN]);

    expect(await registry.scopes()).toEqual(['b:read', 'lasso:admin', 'x:read', 'x:write']);
  });

  it('finds a stored resource by its indicator', async () => {
    const registry = createResourceRegistry(storeOf([makeResource()]), [ADMIN]);

    expect(await registry.get('https://api.example.com/')).toMatchObject({
      name: 'Example API',
      scopes: ['example:read', 'example:write'],
    });
    expect(await registry.get('https://nope.example.com/')).toBeUndefined();
  });

  it('answers for a built-in resource without reading the table', async () => {
    const store = storeOf([]);
    const registry = createResourceRegistry(store, [ADMIN]);

    await registry.get(ADMIN.indicator);

    expect(store.get).not.toHaveBeenCalled();
  });

  it('carries the portal app link through', async () => {
    const record = makeResource({}, { type: 'mcp', url: 'https://api.example.com/mcp' });
    const registry = createResourceRegistry(storeOf([record]), []);

    expect((await registry.get('https://api.example.com/'))?.app).toEqual({
      type: 'mcp',
      url: 'https://api.example.com/mcp',
    });
  });
});
