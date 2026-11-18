import { describe, expect, it } from 'vitest';
import { ResetPasswordPage } from '#src/portal/admin/views/reset-password.tsx';
import { TEMP_PASSWORD_TTL_DAYS } from '#src/users/provision.ts';
import { makeUser } from '#test/support/users.ts';

const user = makeUser();

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
