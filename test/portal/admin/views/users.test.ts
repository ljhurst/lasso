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

  it('labels each cell and leaves the View link unlabelled', async () => {
    const html = await UsersListPage({ users: [user({})] });

    expect(html).toContain('data-label="Name"');
    expect(html).toContain('data-label="Email"');
    expect(html).toContain('data-label="Roles"');
    expect(html).toMatch(/<td role="cell"><a class="row-action" href="\/admin\/users\/sub-1">/);
  });

  it('links to the add-user page and has no form of its own', async () => {
    const html = await UsersListPage({ users: [] });

    expect(html).toContain('href="/admin/users/new"');
    expect(html).not.toContain('action="/admin/users"');
    expect(html).not.toContain('name="email"');
  });

  it("shows each user's status", async () => {
    const html = await UsersListPage({
      users: [
        user({ sub: 'a', mustChangePassword: true }),
        user({ sub: 'b', mustChangePassword: false }),
      ],
    });

    expect(html).toContain('data-label="Status"');
    expect(html).toContain('<span>Hasn&#39;t signed in yet</span>');
    expect(html).toContain('<span>Active</span>');
  });
});
