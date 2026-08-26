import { describe, expect, it } from 'vitest';

process.env.LASSO_OIDC_TABLE_NAME ??= 'lj-lasso-test';
process.env.LASSO_USERS_TABLE_NAME ??= 'lj-lasso-users-test';
process.env.LASSO_JWKS_SSM_PARAM ??= '/lasso/jwks-test';
process.env.LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM ??=
  '/lasso/porto-victoria-client-secret-test';
process.env.LASSO_ISSUER ??= 'https://lasso.example.com';

const { getUserApps } = await import('#src/portal/apps/routes.ts');

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
