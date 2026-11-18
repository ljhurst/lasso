import type { User } from '#src/users/types.ts';

export type AccountStatus = 'waiting' | 'active';

export const STATUS_LABEL: Record<AccountStatus, string> = {
  waiting: "Hasn't signed in yet",
  active: 'Active',
};

export function accountStatus(user: Pick<User, 'mustChangePassword'>): AccountStatus {
  return user.mustChangePassword ? 'waiting' : 'active';
}
