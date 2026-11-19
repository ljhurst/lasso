import { describe, expect, it } from 'vitest';
import { issueTemporaryPassword } from '#src/users/provision.ts';
import {
  type ExpressionUpdate,
  passwordUpdate,
  rolesUpdate,
  temporaryPasswordUpdate,
} from '#src/users/storage/expressions.ts';

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

describe('passwordUpdate', () => {
  it('writes the new hash and salt, ends the forced change and clears the temporary fields', () => {
    const update = passwordUpdate({ hash: 'h', salt: 's' });

    expect(update.ExpressionAttributeValues).toEqual({
      ':hash': 'h',
      ':salt': 's',
      ':false': false,
    });
    expect(update.UpdateExpression).toBe(
      'SET passwordHash = :hash, passwordSalt = :salt, mustChangePassword = :false REMOVE tempPasswordExpiresAt, passwordResetAt',
    );
  });

  it('leaves nothing that a temporary password set still in place', async () => {
    const temp = await issueTemporaryPassword(1_800_000_000_000);

    const set = touchedBy(temporaryPasswordUpdate(temp, '2027-01-01T00:00:00.000Z'));
    const handled = touchedBy(passwordUpdate({ hash: 'h', salt: 's' }));

    expect(set.length).toBeGreaterThan(0);
    expect(handled).toEqual(expect.arrayContaining(set));
  });
});

describe('rolesUpdate', () => {
  it('replaces the list, aliasing the reserved word', () => {
    expect(rolesUpdate(['a:read', 'b:write'])).toEqual({
      UpdateExpression: 'SET #roles = :roles',
      ExpressionAttributeNames: { '#roles': 'roles' },
      ExpressionAttributeValues: { ':roles': ['a:read', 'b:write'] },
    });
  });
});

/** The attributes an update writes or removes. */
function touchedBy(update: ExpressionUpdate): string[] {
  const [setPart = '', removePart = ''] = update.UpdateExpression.replace(/^SET /, '').split(
    ' REMOVE ',
  );
  const written = setPart.split(', ').map((assignment) => assignment.split(' = ')[0] ?? '');
  const removed = removePart.split(', ').filter(Boolean);
  return [...written, ...removed];
}
