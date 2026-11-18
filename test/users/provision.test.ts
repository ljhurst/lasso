import { describe, expect, it } from 'vitest';
import { verifyPassword } from '#src/users/password.ts';
import {
  buildNewUser,
  issueTemporaryPassword,
  parseNewUser,
  TEMP_PASSWORD_TTL_DAYS,
  temporaryPasswordUpdate,
} from '#src/users/provision.ts';

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

  it('gives a new user a temporary password that expires and is not marked as a reset', async () => {
    const { user } = await buildNewUser(input);

    expect(user.tempPasswordExpiresAt).toBeGreaterThan(Date.now() / 1000);
    expect(user.passwordResetAt).toBeUndefined();
  });

  it('gives each user its own sub and password', async () => {
    const [first, second] = [await buildNewUser(input), await buildNewUser(input)];

    expect(first.user.sub).not.toBe(second.user.sub);
    expect(first.tempPassword).not.toBe(second.tempPassword);
  });
});

describe('issueTemporaryPassword', () => {
  const NOW_MS = 1_800_000_000_000;

  it('expires the password after the lifetime', async () => {
    const temp = await issueTemporaryPassword(NOW_MS);

    expect(temp.expiresAt).toBe(1_800_000_000 + TEMP_PASSWORD_TTL_DAYS * 24 * 60 * 60);
  });

  it('returns a password that matches its hash', async () => {
    const temp = await issueTemporaryPassword(NOW_MS);

    expect(await verifyPassword(temp.tempPassword, { hash: temp.hash, salt: temp.salt })).toBe(
      true,
    );
  });
});

describe('temporaryPasswordUpdate', () => {
  it('puts the user back on a temporary password that expires, and marks the reset', async () => {
    const temp = await issueTemporaryPassword(1_800_000_000_000);

    const update = temporaryPasswordUpdate(temp, '2027-01-01T00:00:00.000Z');

    expect(update.ExpressionAttributeValues).toEqual({
      ':hash': temp.hash,
      ':salt': temp.salt,
      ':true': true,
      ':expiresAt': temp.expiresAt,
      ':resetAt': '2027-01-01T00:00:00.000Z',
    });
    for (const field of [
      'passwordHash',
      'passwordSalt',
      'mustChangePassword',
      'tempPasswordExpiresAt',
      'passwordResetAt',
    ]) {
      expect(update.UpdateExpression).toContain(field);
    }
    expect(JSON.stringify(update)).not.toContain(temp.tempPassword);
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
