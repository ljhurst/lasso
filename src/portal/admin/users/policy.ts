import { allResourceScopes } from '#src/config/resources.ts';
import { LASSO_ADMIN_SCOPE } from '#src/config/scopes.ts';
import type { HeldRole } from '#src/portal/admin/users/types.ts';
import type { User } from '#src/users/types.ts';

/**
 * Whether an admin may remove `role` from `target`. Roles the target holds are
 * removable even after leaving the config, and known scopes are accepted even
 * once gone so a revocation that failed partway can be retried. Admins can't
 * drop their own admin role.
 */
export function canRemoveRole(target: User, role: string, actorSub: string): boolean {
  const isKnown = target.roles.includes(role) || allResourceScopes.includes(role);
  const isSelfLockout = target.sub === actorSub && role === LASSO_ADMIN_SCOPE;
  return isKnown && !isSelfLockout;
}

/** Admins can't delete or reset their own account, so they can't lock themselves out. */
export function canManageUser(target: User, actorSub: string): boolean {
  return target.sub !== actorSub;
}

export function buildHeldRoles(user: User, actorSub: string): HeldRole[] {
  return user.roles.toSorted().map((role) => ({
    role,
    registered: allResourceScopes.includes(role),
    blockedReason: canRemoveRole(user, role, actorSub)
      ? undefined
      : "Can't remove your own admin role",
  }));
}

export function byLatestExpiry<T extends { expiresAt?: number }>(a: T, b: T): number {
  return (b.expiresAt ?? 0) - (a.expiresAt ?? 0);
}
