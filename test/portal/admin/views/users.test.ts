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

  it('labels each cell with its column heading', async () => {
    const html = await UsersListPage({ users: [user({})] });

    expect(html).toContain('data-label="Name"');
    expect(html).toContain('data-label="Email"');
    expect(html).toContain('data-label="Roles"');
    expect(html).toContain('data-label="Status"');
  });

  it('makes the name the link to the user, with no separate View button', async () => {
    const html = await UsersListPage({ users: [user({})] });

    expect(html).toContain('<a class="name-link" href="/admin/users/sub-1">Friend Person</a>');
    expect(html).not.toContain('>View<');
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

  describe('order', () => {
    function order(html: string, emails: string[]): number[] {
      return emails.map((email) => html.indexOf(email));
    }

    it('lists users by first name, ignoring case', async () => {
      const html = await UsersListPage({
        users: [
          user({ givenName: 'emma', email: 'e@example.com' }),
          user({ givenName: 'Zed', email: 'z@example.com' }),
          user({ givenName: 'Adam', email: 'a@example.com' }),
        ],
      });
      const positions = order(html, ['a@example.com', 'e@example.com', 'z@example.com']);

      expect(positions).toEqual([...positions].sort((x, y) => x - y));
    });

    it('breaks a tie on first name by family name, then email', async () => {
      const html = await UsersListPage({
        users: [
          user({ givenName: 'Sam', familyName: 'Young', email: 'sy@example.com' }),
          user({ givenName: 'Sam', familyName: 'Ames', email: 'sb@example.com' }),
          user({ givenName: 'Sam', familyName: 'Ames', email: 'sa@example.com' }),
        ],
      });
      const positions = order(html, ['sa@example.com', 'sb@example.com', 'sy@example.com']);

      expect(positions).toEqual([...positions].sort((x, y) => x - y));
    });

    it('leaves the list it was given untouched', async () => {
      const users = [user({ givenName: 'Zed' }), user({ givenName: 'Adam' })];

      await UsersListPage({ users });

      expect(users.map((u) => u.givenName)).toEqual(['Zed', 'Adam']);
    });
  });
});
