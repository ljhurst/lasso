import { describe, expect, it } from 'vitest';
import { verifyPassword } from '#src/users/password.ts';
import { buildNewUser, parseNewUser } from '#src/users/provision.ts';

function form(fields: Record<string, string>): URLSearchParams {
  return new URLSearchParams({
    givenName: 'Friend',
    familyName: 'Person',
    email: 'friend@example.com',
    ...fields,
  });
}

describe('buildNewUser', () => {
  const input = {
    email: '  Friend@Example.COM ',
    givenName: 'Friend',
    familyName: 'Person',
    roles: ['freal:read'],
  };

  it('normalizes the email and forces a password change at first sign-in', async () => {
    const { user } = await buildNewUser(input);

    expect(user.email).toBe('friend@example.com');
    expect(user.mustChangePassword).toBe(true);
    expect(user.roles).toEqual(['freal:read']);
  });

  it('returns a temporary password that matches the stored hash, and keeps only the hash', async () => {
    const { user, tempPassword } = await buildNewUser(input);

    expect(
      await verifyPassword(tempPassword, { hash: user.passwordHash, salt: user.passwordSalt }),
    ).toBe(true);
    expect(JSON.stringify(user)).not.toContain(tempPassword);
  });

  it('gives each user its own sub and password', async () => {
    const [first, second] = [await buildNewUser(input), await buildNewUser(input)];

    expect(first.user.sub).not.toBe(second.user.sub);
    expect(first.tempPassword).not.toBe(second.tempPassword);
  });
});

describe('parseNewUser', () => {
  it('accepts a valid form and normalizes it', () => {
    const parsed = parseNewUser(form({ givenName: ' Friend ', email: ' Friend@Example.COM ' }));

    expect(parsed).toEqual({
      details: { email: 'friend@example.com', givenName: 'Friend', familyName: 'Person' },
    });
  });

  it('never reads a role from the form', () => {
    const parsed = parseNewUser(form({ role: 'lasso:admin' }));

    expect(parsed).not.toHaveProperty('details.roles');
  });

  it.each([
    ['a blank given name', { givenName: '   ' }],
    ['a blank family name', { familyName: '' }],
    ['a given name over 100 characters', { givenName: 'a'.repeat(101) }],
    ['an email with no domain', { email: 'friend@' }],
    ['an email with spaces', { email: 'fri end@example.com' }],
    ['an email over 254 characters', { email: `${'a'.repeat(250)}@example.com` }],
  ])('refuses %s', (_name, fields) => {
    expect(parseNewUser(form(fields))).toHaveProperty('error');
  });
});
