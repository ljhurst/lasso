import { describe, expect, it } from 'vitest';
import { UsersListPage } from '#src/portal/admin/views/users.tsx';
import { makeUser } from '#test/support/users.ts';

const HOSTILE = '<img src=x onerror=alert(1)>';

describe('UsersListPage', () => {
  it.each([
    ['given name', { givenName: HOSTILE }],
    ['family name', { familyName: HOSTILE }],
    ['email', { email: HOSTILE }],
    ['role', { roles: [HOSTILE] }],
  ])('escapes a hostile %s', async (_name, overrides) => {
    const html = await UsersListPage({ users: [makeUser(overrides)] });

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('&lt;img');
  });

  it('labels each cell with its column heading', async () => {
    const html = await UsersListPage({ users: [makeUser({})] });

    expect(html).toContain('data-label="Name"');
    expect(html).toContain('data-label="Email"');
    expect(html).toContain('data-label="Roles"');
    expect(html).toContain('data-label="Status"');
  });

  it('makes the name the link to the user, with no separate View button', async () => {
    const html = await UsersListPage({ users: [makeUser({})] });

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
        makeUser({ sub: 'a', mustChangePassword: true }),
        makeUser({ sub: 'b', mustChangePassword: false }),
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
          makeUser({ givenName: 'emma', email: 'e@example.com' }),
          makeUser({ givenName: 'Zed', email: 'z@example.com' }),
          makeUser({ givenName: 'Adam', email: 'a@example.com' }),
        ],
      });
      const positions = order(html, ['a@example.com', 'e@example.com', 'z@example.com']);

      expect(positions).toEqual([...positions].sort((x, y) => x - y));
    });

    it('breaks a tie on first name by family name, then email', async () => {
      const html = await UsersListPage({
        users: [
          makeUser({ givenName: 'Sam', familyName: 'Young', email: 'sy@example.com' }),
          makeUser({ givenName: 'Sam', familyName: 'Ames', email: 'sb@example.com' }),
          makeUser({ givenName: 'Sam', familyName: 'Ames', email: 'sa@example.com' }),
        ],
      });
      const positions = order(html, ['sa@example.com', 'sb@example.com', 'sy@example.com']);

      expect(positions).toEqual([...positions].sort((x, y) => x - y));
    });

    it('leaves the list it was given untouched', async () => {
      const users = [makeUser({ givenName: 'Zed' }), makeUser({ givenName: 'Adam' })];

      await UsersListPage({ users });

      expect(users.map((u) => u.givenName)).toEqual(['Zed', 'Adam']);
    });
  });
});
