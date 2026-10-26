import { describe, expect, it } from 'vitest';
import { getUserApps } from '#src/portal/apps/routes.ts';

describe('getUserApps', () => {
  it('returns nothing for a user with no roles', () => {
    expect(getUserApps([])).toEqual([]);
  });

  it('returns only the resources a role grants access to', () => {
    const apps = getUserApps(['fife:read']);

    expect(apps).toHaveLength(1);
    expect(apps[0]?.resource.name).toBe('Fife');
  });

  it('excludes Lasso itself even when the caller holds lasso:admin', () => {
    const apps = getUserApps(['lasso:admin']);

    expect(apps).toEqual([]);
  });
});
