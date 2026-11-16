import { describe, expect, it } from 'vitest';
import { ChangePasswordPage } from '#src/interactions/views/change-password.tsx';
import { ErrorPage } from '#src/interactions/views/error.tsx';
import { LoginPage } from '#src/interactions/views/login.tsx';
import { LogoutPage } from '#src/interactions/views/logout.tsx';
import { PostLogoutPage } from '#src/interactions/views/post-logout.tsx';

const HOSTILE = '<img src=x onerror=alert(1)>';
const BREAKOUT = '"><img src=x onerror=alert(1)>';

const pages: [string, () => string | Promise<string>][] = [
  ['login error', () => LoginPage({ uid: 'u', error: HOSTILE })],
  ['change-password error', () => ChangePasswordPage({ uid: 'u', email: 'a@b.c', error: HOSTILE })],
  ['error code', () => ErrorPage({ error: HOSTILE })],
  ['error description', () => ErrorPage({ error: 'e', errorDescription: HOSTILE })],
  ['logout client name', () => LogoutPage({ form: '<form></form>', clientName: HOSTILE })],
  ['post-logout client name', () => PostLogoutPage({ clientName: HOSTILE })],
];

describe('sign-in pages escape what they print', () => {
  it.each(pages)('%s', async (_name, render) => {
    const html = await render();

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('&lt;img');
  });

  it('still passes the provider logout form through as HTML', async () => {
    const html = await LogoutPage({ form: '<form id="op.logoutForm"></form>' });

    expect(html).toContain('<form id="op.logoutForm"></form>');
  });

  it('keeps a typed email inside its attribute', async () => {
    const html = await ChangePasswordPage({ uid: 'u', email: BREAKOUT });

    expect(html).not.toContain('"><img');
    expect(html).toContain('&#34;');
  });
});
