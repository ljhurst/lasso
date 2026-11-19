import type { TemporaryPassword } from '#src/users/provision.ts';

export interface TemporaryPasswordUpdate {
  UpdateExpression: string;
  ExpressionAttributeValues: Record<string, string | number | boolean>;
}

/** The write that puts an existing user back on a temporary password. */
export function temporaryPasswordUpdate(
  temp: TemporaryPassword,
  resetAt: string,
): TemporaryPasswordUpdate {
  return {
    UpdateExpression:
      'SET passwordHash = :hash, passwordSalt = :salt, mustChangePassword = :true, tempPasswordExpiresAt = :expiresAt, passwordResetAt = :resetAt',
    ExpressionAttributeValues: {
      ':hash': temp.hash,
      ':salt': temp.salt,
      ':true': true,
      ':expiresAt': temp.expiresAt,
      ':resetAt': resetAt,
    },
  };
}
