import { describe, expect, it } from 'vitest';
import { getUserApps } from '#src/portal/apps/apps.ts';
import { registryWithBuiltIns } from '#test/support/resources.ts';
import { makeResource } from '#test/support/resources.ts';

const registry = registryWithBuiltIns();

describe('getUserApps', () => {
  it('returns nothing for a user with no roles', async () => {
    expect(await getUserApps(registry, [])).toEqual([]);
  });

  it('returns only the resources a role grants access to', async () => {
    const apps = await getUserApps(registry, ['fife:read']);

    expect(apps).toHaveLength(1);
    expect(apps[0]?.resource.name).toBe('Fife');
  });

  it('excludes Lasso itself even when the caller holds lasso:admin', async () => {
    expect(await getUserApps(registry, ['lasso:admin'])).toEqual([]);
  });

  it('includes a stored resource as soon as it exists', async () => {
    const stored = registryWithBuiltIns([makeResource({ scopes_supported: ['example:read'] })]);

    const apps = await getUserApps(stored, ['example:read']);

    expect(apps.map((app) => app.resource.name)).toEqual(['Example API']);
  });
});
