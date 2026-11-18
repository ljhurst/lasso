import { describe, expect, it } from 'vitest';
import { CreatedUserPage } from '#src/portal/admin/views/created-user.tsx';

const user = {
  sub: 'b3698a6c-188e-4a4f-8c79-a8e09843fc34',
  email: 'friend@example.com',
  emailVerified: true,
  givenName: 'Friend',
  familyName: 'Person',
  passwordHash: 'hash',
  passwordSalt: 'salt',
  mustChangePassword: true,
  roles: [],
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('CreatedUserPage', () => {
  it('shows the temporary password once, with a copy button for it', async () => {
    const html = await CreatedUserPage({ user, tempPassword: 'aaaa-bbbb-cccc' });

    expect(html).toContain('aaaa-bbbb-cccc');
    expect(html).toContain('id="temp-password"');
    expect(html).toContain('data-copy-target="temp-password"');
    expect(html).toContain('Shown once');
  });

  it('sends you on to add roles, or to add another user', async () => {
    const html = await CreatedUserPage({ user, tempPassword: 'aaaa-bbbb-cccc' });

    expect(html).toContain(`href="/admin/users/${user.sub}"`);
    expect(html).toContain('Add roles');
    expect(html).toContain('href="/admin/users/new"');
    expect(html).toContain("can't open any app until you add a role");
  });

  it.each([
    ['given name', { givenName: '<img src=x onerror=alert(1)>' }],
    ['family name', { familyName: '<img src=x onerror=alert(1)>' }],
    ['email', { email: '<img src=x onerror=alert(1)>' }],
  ])('escapes a hostile %s', async (_name, overrides) => {
    const html = await CreatedUserPage({ user: { ...user, ...overrides }, tempPassword: 'abcd' });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});
