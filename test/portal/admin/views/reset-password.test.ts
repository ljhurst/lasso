import { describe, expect, it } from 'vitest';
import { ResetPasswordPage } from '#src/portal/admin/views/reset-password.tsx';
import { TEMP_PASSWORD_TTL_DAYS } from '#src/users/provision.ts';

const user = {
  sub: 'b3698a6c-188e-4a4f-8c79-a8e09843fc34',
  email: 'friend@example.com',
  emailVerified: true,
  givenName: 'Friend',
  familyName: 'Person',
  passwordHash: 'hash',
  passwordSalt: 'salt',
  mustChangePassword: false,
  roles: [],
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('ResetPasswordPage', () => {
  it('names the account and posts the reset to its own address, submitted once', async () => {
    const html = await ResetPasswordPage({ user });

    expect(html).toContain('Friend Person');
    expect(html).toContain('friend@example.com');
    expect(html).toMatch(
      new RegExp(`<form[^>]*action="/admin/users/${user.sub}/reset-password"[^>]*data-once`),
    );
  });

  it('outlines the reset button in red rather than filling it', async () => {
    expect(await ResetPasswordPage({ user })).toContain('class="row-action caution"');
  });

  it('says how long the temporary password lasts', async () => {
    expect(await ResetPasswordPage({ user })).toContain(`works for ${TEMP_PASSWORD_TTL_DAYS} days`);
  });

  it('offers a way back that changes nothing', async () => {
    expect(await ResetPasswordPage({ user })).toContain(`href="/admin/users/${user.sub}"`);
  });

  it.each([
    ['email', { email: '<img src=x onerror=alert(1)>' }],
    ['given name', { givenName: '<img src=x onerror=alert(1)>' }],
    ['family name', { familyName: '<img src=x onerror=alert(1)>' }],
  ])('escapes a hostile %s', async (_name, overrides) => {
    const html = await ResetPasswordPage({ user: { ...user, ...overrides } });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});
