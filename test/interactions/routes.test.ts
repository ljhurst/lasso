import { describe, expect, it } from 'vitest';

process.env.LASSO_OIDC_TABLE_NAME ??= 'lj-lasso-test';
process.env.LASSO_USERS_TABLE_NAME ??= 'lj-lasso-users-test';
process.env.LASSO_JWKS_SSM_PARAM ??= '/lasso/jwks-test';
process.env.LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM ??=
  '/lasso/porto-victoria-client-secret-test';
process.env.LASSO_ISSUER ??= 'https://lasso.example.com';

const { filterGrantedScope } = await import('../../src/interactions/routes.ts');

describe('filterGrantedScope', () => {
  it('grants every requested scope the account has a matching role for', () => {
    const granted = filterGrantedScope(
      ['fife:read', 'fife:write', 'fife:admin'],
      ['fife:read', 'fife:write', 'fife:admin'],
    );
    expect(granted).toEqual(['fife:read', 'fife:write', 'fife:admin']);
  });

  it('drops requested scopes the account has no matching role for', () => {
    const granted = filterGrantedScope(
      ['fife:read', 'fife:write', 'fife:admin'],
      ['fife:read', 'fife:write'],
    );
    expect(granted).toEqual(['fife:read', 'fife:write']);
  });

  it('grants nothing when the account has no matching roles', () => {
    const granted = filterGrantedScope(['fife:read', 'fife:write'], []);
    expect(granted).toEqual([]);
  });
});
