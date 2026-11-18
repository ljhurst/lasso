import type { User } from '#src/users/types.ts';

export type AccountStatus = 'active' | 'waiting' | 'reset' | 'expired';

type StatusFields = Pick<User, 'mustChangePassword' | 'tempPasswordExpiresAt' | 'passwordResetAt'>;

export const STATUS_LABEL: Record<AccountStatus, string> = {
  active: 'Active',
  waiting: "Hasn't signed in yet",
  reset: "Password reset, hasn't signed in",
  expired: 'Temporary password expired',
};

/** A temporary password with no expiry, from before expiries existed, never lapses. */
export function isTemporaryPasswordExpired(
  user: Pick<User, 'mustChangePassword' | 'tempPasswordExpiresAt'>,
  nowSeconds = Date.now() / 1000,
): boolean {
  return (
    user.mustChangePassword &&
    user.tempPasswordExpiresAt !== undefined &&
    user.tempPasswordExpiresAt <= nowSeconds
  );
}

export function accountStatus(user: StatusFields, nowSeconds = Date.now() / 1000): AccountStatus {
  if (!user.mustChangePassword) {
    return 'active';
  }
  if (isTemporaryPasswordExpired(user, nowSeconds)) {
    return 'expired';
  }
  return user.passwordResetAt ? 'reset' : 'waiting';
}
