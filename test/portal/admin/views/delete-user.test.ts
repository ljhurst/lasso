import { describe, expect, it } from 'vitest';
import { DeleteUserPage } from '#src/portal/admin/views/delete-user.tsx';
import { makeUser } from '#test/support/users.ts';

const user = makeUser();

describe('DeleteUserPage', () => {
  it('names the account and posts the delete to its own address', async () => {
    const html = await DeleteUserPage({ user });

    expect(html).toContain('friend@example.com');
    expect(html).toContain(`action="/admin/users/${user.sub}/delete"`);
  });

  it('shows who is being deleted as labelled facts', async () => {
    const html = await DeleteUserPage({ user });

    expect(html).toContain('<dt>Name</dt><dd><span>Friend Person</span></dd>');
    expect(html).toMatch(/<dt>Email<\/dt><dd><code>friend@example.com<\/code><\/dd>/);
  });

  it('lists what happens as separate points', async () => {
    const html = await DeleteUserPage({ user });

    expect(html.match(/<li>/g)).toHaveLength(4);
    expect(html).toContain("can't be undone");
  });

  it('offers a way back that deletes nothing', async () => {
    const html = await DeleteUserPage({ user });

    expect(html).toContain(`href="/admin/users/${user.sub}"`);
  });

  it.each([
    ['email', { email: '<img src=x onerror=alert(1)>' }],
    ['given name', { givenName: '<img src=x onerror=alert(1)>' }],
    ['family name', { familyName: '<img src=x onerror=alert(1)>' }],
  ])('escapes a hostile %s', async (_name, overrides) => {
    const hostile = '<img src=x onerror=alert(1)>';
    const html = await DeleteUserPage({ user: { ...user, ...overrides } });

    expect(html).not.toContain(hostile);
    expect(html).toContain('&lt;img');
  });
});
