import { describe, expect, it } from 'vitest';
import { MAX_EMAIL_LENGTH, MAX_NAME_LENGTH } from '#src/users/provision.ts';
import { NewUserPage } from '#src/portal/admin/views/new-user.tsx';

const BREAKOUT = '"><img src=x onerror=alert(1)>';

describe('NewUserPage', () => {
  it('has a field for each detail and posts to the users address', async () => {
    const html = await NewUserPage({});

    expect(html).toContain('action="/admin/users"');
    for (const name of ['givenName', 'familyName', 'email']) {
      expect(html).toContain(`name="${name}"`);
    }
  });

  it('offers no role choice', async () => {
    const html = await NewUserPage({});

    expect(html).not.toContain('<select');
    expect(html).not.toContain('name="role"');
  });

  it('limits each field to what the server accepts', async () => {
    const html = await NewUserPage({});

    expect(html.match(new RegExp(`maxlength="${MAX_NAME_LENGTH}"`, 'g'))).toHaveLength(2);
    expect(html).toContain(`maxlength="${MAX_EMAIL_LENGTH}"`);
  });

  it('is submitted only once', async () => {
    expect(await NewUserPage({})).toMatch(/<form[^>]*data-once/);
  });

  it('has a way back that adds nothing', async () => {
    expect(await NewUserPage({})).toContain('href="/admin/users"');
  });

  it('shows an error and keeps what was typed', async () => {
    const html = await NewUserPage({
      error: 'Enter a valid email address.',
      values: { givenName: 'Friend', familyName: 'Person', email: 'nope' },
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('Enter a valid email address.');
    expect(html).toContain('value="nope"');
    expect(html).toContain('value="Friend"');
  });

  it('escapes what was typed', async () => {
    const html = await NewUserPage({
      values: { givenName: BREAKOUT, familyName: BREAKOUT, email: BREAKOUT },
    });

    expect(html).not.toContain('"><img');
    expect(html).toContain('&#34;');
  });

  it('shows a way back to the users list above the form', async () => {
    const html = await NewUserPage({});

    expect(html).toContain('<li><a href="/admin/users">Users</a></li>');
    expect(html).not.toContain('aria-current');
  });
});
