import type { User } from '#src/users/types.ts';

export function fullName(user: Pick<User, 'givenName' | 'familyName'>): string {
  return `${user.givenName} ${user.familyName}`;
}
