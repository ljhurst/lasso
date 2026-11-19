import { describe, expect, it } from 'vitest';
import { issueTemporaryPassword } from '#src/users/provision.ts';
import { temporaryPasswordUpdate } from '#src/users/storage/expressions.ts';

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
