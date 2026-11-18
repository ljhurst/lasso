import { describe, expect, it } from 'vitest';
import { UserDetailPage } from '#src/portal/admin/views/user-detail.tsx';

const user = {
  sub: 'b3698a6c-188e-4a4f-8c79-a8e09843fc34',
  email: 'friend@example.com',
  emailVerified: true,
  givenName: 'Friend',
  familyName: 'Person',
  passwordHash: 'hash',
  passwordSalt: 'salt',
  mustChangePassword: false,
  roles: ['freal:read'],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function render(overrides: Partial<Parameters<typeof UserDetailPage>[0]> = {}) {
  return UserDetailPage({
    user,
    sessions: [],
    grants: [],
    accessTokens: [],
    roles: [],
    grantableRoles: [],
    ...overrides,
  });
}

const HOSTILE = '<img src=x onerror=alert(1)>';
const BREAKOUT = '"><img src=x onerror=alert(1)>';

describe('UserDetailPage', () => {
  it('shows the sub', async () => {
    expect(await render()).toContain(user.sub);
  });

  it('shows what each session signed in to, by id', async () => {
    const html = await render({
      sessions: [
        {
          id: 's-1',
          clientIds: ['freal', 'retired-app'],
          loginTs: 1_799_000_000,
          expiresAt: 1_800_000_000,
        },
      ],
    });

    expect(html).toContain('<code>freal</code>');
    expect(html).not.toContain('Freal');
    expect(html).toContain('<code>retired-app</code>');
    expect(html).toContain('datetime="2027-01-15T08:00:00.000Z"');
  });

  it('labels every cell with its column heading', async () => {
    const html = await render({
      sessions: [{ id: 's-1', clientIds: ['freal'], loginTs: 1, expiresAt: 2 }],
      grants: [{ id: 'g-1', clientId: 'freal', expiresAt: 2 }],
      accessTokens: [{ id: 't-1', clientId: 'freal', scope: 'openid', expiresAt: 2 }],
    });
    const labels = [...html.matchAll(/data-label="([^"]+)"/g)].map((match) => match[1]);

    expect(labels).toEqual([
      'Apps',
      'Signed in',
      'Expires',
      'Session ID',
      'Client',
      'Expires',
      'Grant ID',
      'Client',
      'Scope',
      'Expires',
    ]);
  });

  it('keeps table roles on the rows and cells', async () => {
    const html = await render({ grants: [{ id: 'g-1', clientId: 'freal' }] });

    expect(html).toContain('<table role="table">');
    expect(html).toContain('<tr role="row">');
    expect(html).toContain('role="cell"');
  });

  it('shows the email and sub as labelled facts', async () => {
    const html = await render();

    expect(html).toMatch(/<dt>Email<\/dt><dd><code>friend@example.com<\/code><\/dd>/);
    expect(html).toContain('<dt>User ID (sub)</dt>');
    expect(html).not.toContain('<dt>Roles</dt>');
  });

  describe('roles', () => {
    const held = { role: 'freal:read', registered: true };

    it('counts the roles and lists each with its own remove form', async () => {
      const html = await render({
        roles: [held, { role: 'fife:read', registered: true }],
      });

      expect(html).toContain('Roles (2)');
      expect(html).toContain(`action="/admin/users/${user.sub}/roles/remove"`);
      expect(html).toContain('<input type="hidden" name="role" value="freal:read"/>');
      expect(html).toContain('aria-label="Remove freal:read"');
    });

    it('says so when the user has no roles', async () => {
      expect(await render()).toContain('No roles yet.');
    });

    it('starts the add dropdown on a placeholder and offers only the roles to grant', async () => {
      const html = await render({ grantableRoles: ['fife:read', 'lasso:admin'] });

      expect(html).toContain(`action="/admin/users/${user.sub}/roles"`);
      expect(html).toContain('<select name="role" required');
      expect(html).toMatch(/<option value="">Choose a role…<\/option><option value="fife:read"/);
      expect(html).not.toContain('selected');
    });

    it('replaces the add form when every role is held', async () => {
      const html = await render({ roles: [held] });

      expect(html).toContain('This user already has every registered role.');
      expect(html).not.toContain('class="add-role"');
    });

    it('marks a role that is no longer registered', async () => {
      const html = await render({ roles: [{ ...held, registered: false }] });

      expect(html).toContain('no longer registered');
    });

    it('disables removing a role that cannot be removed and says why', async () => {
      const html = await render({ roles: [{ ...held, blockedReason: 'Locked for a reason' }] });

      expect(html).toMatch(/<button[^>]*disabled/);
      expect(html).toContain('Locked for a reason');
    });

    it('does not disable a removable role', async () => {
      expect(await render({ roles: [held] })).not.toMatch(/<button[^>]*disabled/);
    });
  });

  it('shows a dash for a session with no apps', async () => {
    const html = await render({ sessions: [{ id: 's-1', clientIds: [] }] });

    expect(html).toContain('empty-cell');
  });

  it('explains sessions, grants and access tokens', async () => {
    const html = await render({
      sessions: [{ id: 's-1', clientIds: [] }],
      grants: [{ id: 'g-1', clientId: 'freal' }],
      accessTokens: [{ id: 't-1', clientId: 'freal' }],
    });

    expect(html).toContain('A browser sign-in to Lasso');
    expect(html).toContain('What this person agreed to let an app access');
    expect(html).toContain('Short-lived credentials');
  });

  it('orders the grant columns client, expires, then the id', async () => {
    const html = await render({ grants: [{ id: 'g-1', clientId: 'freal' }] });
    const headers = ['>Client<', '>Expires<', '>Grant ID<'].map((h) => html.indexOf(h));

    expect(headers.every((position) => position >= 0)).toBe(true);
    expect(headers).toEqual([...headers].sort((a, b) => a - b));
  });

  it.each([
    ['given name', { user: { ...user, givenName: HOSTILE } }],
    ['email', { user: { ...user, email: HOSTILE } }],
    ['session id', { sessions: [{ id: HOSTILE, clientIds: [] }] }],
    ['grant id', { grants: [{ id: HOSTILE, clientId: 'freal' }] }],
    ['client id', { grants: [{ id: 'g-1', clientId: HOSTILE }] }],
    ['token scope', { accessTokens: [{ id: 't', clientId: 'freal', scope: HOSTILE }] }],
  ])('escapes a hostile %s', async (_name, overrides) => {
    const html = await render(overrides);

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('&lt;img');
  });

  it.each([
    ['held', { roles: [{ role: BREAKOUT, registered: true }] }],
    ['to grant', { grantableRoles: [BREAKOUT] }],
  ])('keeps a role %s inside its attribute and escapes its label', async (_name, overrides) => {
    const html = await render(overrides);

    expect(html).not.toContain('"><img');
    expect(html).toContain('&#34;');
    expect(html).toContain('&lt;img');
  });
});
