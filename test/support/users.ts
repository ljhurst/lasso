import type { User } from '#src/users/types.ts';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    sub: 'sub-1',
    email: 'friend@example.com',
    emailVerified: true,
    givenName: 'Friend',
    familyName: 'Person',
    passwordHash: 'hash',
    passwordSalt: 'salt',
    mustChangePassword: false,
    roles: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
