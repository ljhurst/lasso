import { describe, expect, it } from 'vitest';
import { TemporaryPasswordPage } from '#src/portal/admin/views/temporary-password.tsx';

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

const PASSWORD = 'aaaa-bbbb-cccc';

describe('TemporaryPasswordPage', () => {
  it.each(['created', 'reset'] as const)(
    'shows the temporary password once, with a copy button, when %s',
    async (mode) => {
      const html = await TemporaryPasswordPage({ mode, user, tempPassword: PASSWORD });

      expect(html).toContain(PASSWORD);
      expect(html).toContain('id="temp-password"');
      expect(html).toContain('data-copy-target="temp-password"');
      expect(html).toContain('Shown once');
    },
  );

  it('shows when the password expires', async () => {
    const html = await TemporaryPasswordPage({
      mode: 'created',
      user,
      tempPassword: PASSWORD,
      expiresAt: 1_800_000_000,
    });

    expect(html).toContain('Expires');
    expect(html).toContain('datetime="2027-01-15T08:00:00.000Z"');
  });

  it('says nothing about expiry when there is none', async () => {
    const html = await TemporaryPasswordPage({ mode: 'created', user, tempPassword: PASSWORD });

    expect(html).not.toContain('Expires');
  });

  it('for a new user, sends you on to add roles or to add another', async () => {
    const html = await TemporaryPasswordPage({ mode: 'created', user, tempPassword: PASSWORD });

    expect(html).toContain('Created');
    expect(html).toContain(`href="/admin/users/${user.sub}"`);
    expect(html).toContain('Add roles');
    expect(html).toContain('href="/admin/users/new"');
    expect(html).toContain("can't open any app until you add a role");
  });

  it('for a reset, names the reset and goes back to the user', async () => {
    const html = await TemporaryPasswordPage({ mode: 'reset', user, tempPassword: PASSWORD });

    expect(html).toContain('Password reset for');
    expect(html).toContain('Back to user');
    expect(html).not.toContain('Add roles');
    expect(html).not.toContain('Add another');
    expect(html).toContain('next sign in');
  });

  it.each([
    ['given name', { givenName: '<img src=x onerror=alert(1)>' }],
    ['family name', { familyName: '<img src=x onerror=alert(1)>' }],
    ['email', { email: '<img src=x onerror=alert(1)>' }],
  ])('escapes a hostile %s', async (_name, overrides) => {
    const html = await TemporaryPasswordPage({
      mode: 'reset',
      user: { ...user, ...overrides },
      tempPassword: 'abcd',
    });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});
