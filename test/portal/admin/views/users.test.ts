import { describe, expect, it } from 'vitest';
import { UsersListPage } from '#src/portal/admin/views/users.tsx';

const HOSTILE = '<img src=x onerror=alert(1)>';

function user(overrides: Partial<Parameters<typeof UsersListPage>[0]['users'][number]>) {
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

describe('UsersListPage', () => {
  it.each([
    ['given name', { givenName: HOSTILE }],
    ['family name', { familyName: HOSTILE }],
    ['email', { email: HOSTILE }],
    ['role', { roles: [HOSTILE] }],
  ])('escapes a hostile %s', async (_name, overrides) => {
    const html = await UsersListPage({ users: [user(overrides)] });

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('&lt;img');
  });
});
