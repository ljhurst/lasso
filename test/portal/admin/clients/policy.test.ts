import { describe, expect, it } from 'vitest';
import { allResourceScopes } from '#src/config/resources.ts';
import { LASSO_ADMIN_SCOPE } from '#src/config/scopes.ts';
import { assignableClientScopes, canManageClient } from '#src/portal/admin/clients/policy.ts';

describe('canManageClient', () => {
  it('protects the client the portal signs admins in with', () => {
    expect(canManageClient('lasso-portal')).toBe(false);
    expect(canManageClient('fife')).toBe(true);
  });
});

describe('assignableClientScopes', () => {
  it('offers every scope except the admin one', () => {
    expect(assignableClientScopes).not.toContain(LASSO_ADMIN_SCOPE);
    expect(assignableClientScopes).toEqual(
      allResourceScopes.filter((scope) => scope !== LASSO_ADMIN_SCOPE),
    );
    expect(assignableClientScopes.length).toBeGreaterThan(0);
  });
});
