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
    grantableRoles: [],
    clientNames: { freal: 'Freal' },
    ...overrides,
  });
}

const HOSTILE = '<img src=x onerror=alert(1)>';
const BREAKOUT = '"><img src=x onerror=alert(1)>';

describe('UserDetailPage', () => {
  it('shows the sub', async () => {
    expect(await render()).toContain(user.sub);
  });

  it('shows what each session signed in to, by name with the id beside it', async () => {
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

    expect(html).toContain('<span>Freal</span> <code>freal</code>');
    expect(html).toContain('<code>retired-app</code>');
    expect(html).toContain('datetime="2027-01-15T08:00:00.000Z"');
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

  it('escapes a client name', async () => {
    const html = await render({
      grants: [{ id: 'g-1', clientId: 'evil' }],
      clientNames: { evil: '<script>alert(1)</script>' },
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script>');
  });

  it.each([
    ['given name', { user: { ...user, givenName: HOSTILE } }],
    ['email', { user: { ...user, email: HOSTILE } }],
    ['session id', { sessions: [{ id: HOSTILE, clientIds: [] }] }],
    ['grant id', { grants: [{ id: HOSTILE, clientId: 'freal' }] }],
    ['token scope', { accessTokens: [{ id: 't', clientId: 'freal', scope: HOSTILE }] }],
  ])('escapes a hostile %s', async (_name, overrides) => {
    const html = await render(overrides);

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('&lt;img');
  });

  it.each([
    ['held', { user: { ...user, roles: [BREAKOUT] } }],
    ['to grant', { grantableRoles: [BREAKOUT] }],
  ])('keeps a role %s inside its attribute and escapes its label', async (_name, overrides) => {
    const html = await render(overrides);

    expect(html).not.toContain('"><img');
    expect(html).toContain('&#34;');
    expect(html).toContain('&lt;img');
  });
});
