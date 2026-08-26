import { describe, expect, it } from 'vitest';

process.env.LASSO_OIDC_TABLE_NAME ??= 'lj-lasso-test';
process.env.LASSO_USERS_TABLE_NAME ??= 'lj-lasso-users-test';
process.env.LASSO_JWKS_SSM_PARAM ??= '/lasso/jwks-test';
process.env.LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM ??=
  '/lasso/porto-victoria-client-secret-test';
process.env.LASSO_ISSUER ??= 'https://lasso.example.com';

const { hasAdminScope } = await import('../../../src/portal/auth/session.ts');

describe('hasAdminScope', () => {
  it('returns false for an empty scope', () => {
    expect(hasAdminScope([])).toBe(false);
  });

  it('returns true when lasso:admin is present', () => {
    expect(hasAdminScope(['openid', 'lasso:admin'])).toBe(true);
  });

  it('returns false when only unrelated scopes are present', () => {
    expect(hasAdminScope(['fife:read', 'fife:write'])).toBe(false);
  });
});
