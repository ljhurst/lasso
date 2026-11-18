import { describe, expect, it } from 'vitest';
import {
  buildHeldRoles,
  byLatestExpiry,
  canManageUser,
  canRemoveRole,
} from '#src/portal/admin/policy.ts';
import { makeUser } from '#test/support/users.ts';

function user(sub: string, roles: string[]) {
  return makeUser({ sub, roles });
}

describe('buildHeldRoles', () => {
  it('lists the roles a user holds, sorted', () => {
    const roles = buildHeldRoles(user('sub-1', ['fife:read', 'freal:read']), 'admin');

    expect(roles.map((held) => held.role)).toEqual(['fife:read', 'freal:read']);
  });

  it('marks a held role that is no longer configured', () => {
    const [held] = buildHeldRoles(user('sub-1', ['retired:read']), 'admin');

    expect(held).toEqual({ role: 'retired:read', registered: false, blockedReason: undefined });
  });

  it('refuses to let an admin remove their own admin role', () => {
    const [own] = buildHeldRoles(user('admin', ['lasso:admin']), 'admin');
    const [theirs] = buildHeldRoles(user('sub-1', ['lasso:admin']), 'admin');

    expect(own?.blockedReason).toBe("Can't remove your own admin role");
    expect(theirs?.blockedReason).toBeUndefined();
  });
});

describe('canManageUser', () => {
  it("allows managing someone else's account", () => {
    expect(canManageUser(user('sub-1', []), 'admin')).toBe(true);
  });

  it('refuses an admin managing their own account', () => {
    expect(canManageUser(user('admin', ['lasso:admin']), 'admin')).toBe(false);
  });
});

describe('canRemoveRole', () => {
  it('allows removing a role the user holds', () => {
    expect(canRemoveRole(user('sub-1', ['fife:read']), 'fife:read', 'admin')).toBe(true);
  });

  it('allows removing a held role that is no longer configured', () => {
    expect(canRemoveRole(user('sub-1', ['retired:read']), 'retired:read', 'admin')).toBe(true);
  });

  it('allows a known scope the user no longer holds, so revocation can be retried', () => {
    expect(canRemoveRole(user('sub-1', []), 'fife:read', 'admin')).toBe(true);
  });

  it('refuses an unknown role the user does not hold', () => {
    expect(canRemoveRole(user('sub-1', []), 'made:up', 'admin')).toBe(false);
  });

  it('refuses an admin removing their own admin role', () => {
    expect(canRemoveRole(user('admin', ['lasso:admin']), 'lasso:admin', 'admin')).toBe(false);
  });

  it("allows removing someone else's admin role", () => {
    expect(canRemoveRole(user('sub-1', ['lasso:admin']), 'lasso:admin', 'admin')).toBe(true);
  });
});

describe('byLatestExpiry', () => {
  it('puts the row that expires last first', () => {
    const rows = [{ expiresAt: 100 }, { expiresAt: 300 }, { expiresAt: 200 }];

    expect(rows.sort(byLatestExpiry).map((r) => r.expiresAt)).toEqual([300, 200, 100]);
  });

  it('puts rows with no expiry last', () => {
    const rows = [{ id: 'none' }, { id: 'old', expiresAt: 100 }, { id: 'new', expiresAt: 300 }];

    expect(rows.sort(byLatestExpiry).map((r) => r.id)).toEqual(['new', 'old', 'none']);
  });

  it('keeps rows with the same expiry in their original order', () => {
    const rows = [
      { id: 'a', expiresAt: 100 },
      { id: 'b', expiresAt: 100 },
      { id: 'c' },
      { id: 'd' },
    ];

    expect(rows.sort(byLatestExpiry).map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
