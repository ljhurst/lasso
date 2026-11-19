import { describe, expect, it } from 'vitest';
import { LASSO_ADMIN_SCOPE } from '#src/resources/scopes.ts';
import { assignableClientScopes, canManageClient } from '#src/portal/admin/clients/policy.ts';

describe('canManageClient', () => {
  it('protects the client the portal signs admins in with', () => {
    expect(canManageClient('lasso-portal')).toBe(false);
    expect(canManageClient('fife')).toBe(true);
  });
});

describe('assignableClientScopes', () => {
  it('offers every scope resources offer except the admin one', () => {
    const offered = ['fife:read', LASSO_ADMIN_SCOPE, 'porto:write'];

    expect(assignableClientScopes(offered)).toEqual(['fife:read', 'porto:write']);
  });

  it('offers nothing when no resource offers a scope', () => {
    expect(assignableClientScopes([])).toEqual([]);
  });
});
