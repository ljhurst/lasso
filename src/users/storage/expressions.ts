import type { TemporaryPassword } from '#src/users/provision.ts';

export interface ExpressionUpdate {
  UpdateExpression: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues: Record<string, string | number | boolean | string[]>;
}

/** The write that puts an existing user back on a temporary password. */
export function temporaryPasswordUpdate(
  temp: TemporaryPassword,
  resetAt: string,
): ExpressionUpdate {
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

/** The write that takes a user off a temporary password once they have chosen their own. */
export function passwordUpdate(password: { hash: string; salt: string }): ExpressionUpdate {
  return {
    UpdateExpression:
      'SET passwordHash = :hash, passwordSalt = :salt, mustChangePassword = :false REMOVE tempPasswordExpiresAt, passwordResetAt',
    ExpressionAttributeValues: {
      ':hash': password.hash,
      ':salt': password.salt,
      ':false': false,
    },
  };
}

export function rolesUpdate(roles: string[]): ExpressionUpdate {
  return {
    UpdateExpression: 'SET #roles = :roles',
    ExpressionAttributeNames: { '#roles': 'roles' },
    ExpressionAttributeValues: { ':roles': roles },
  };
}
