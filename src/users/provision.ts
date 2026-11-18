import { randomUUID } from 'node:crypto';
import { normalizeEmail } from '#src/users/email.ts';
import { generateTempPassword, hashPassword } from '#src/users/password.ts';
import type { User } from '#src/users/types.ts';

export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface NewUserDetails {
  email: string;
  givenName: string;
  familyName: string;
}

export interface NewUserInput extends NewUserDetails {
  roles: string[];
}

export interface NewUser {
  user: User;
  tempPassword: string;
}

export type ParsedNewUser = { details: NewUserDetails } | { error: string };

/** The temporary password is returned once and only its hash is kept on the user. */
export async function buildNewUser(input: NewUserInput): Promise<NewUser> {
  const tempPassword = generateTempPassword();
  const { hash, salt } = await hashPassword(tempPassword);

  const user: User = {
    sub: randomUUID(),
    email: normalizeEmail(input.email),
    emailVerified: true,
    givenName: input.givenName,
    familyName: input.familyName,
    passwordHash: hash,
    passwordSalt: salt,
    mustChangePassword: true,
    roles: input.roles,
    createdAt: new Date().toISOString(),
  };
  return { user, tempPassword };
}

/** Reads the add-user form. It never grants roles; those are added from the user page. */
export function parseNewUser(form: URLSearchParams): ParsedNewUser {
  const givenName = (form.get('givenName') ?? '').trim();
  const familyName = (form.get('familyName') ?? '').trim();
  const email = normalizeEmail(form.get('email') ?? '');

  if (!isWithin(givenName, MAX_NAME_LENGTH) || !isWithin(familyName, MAX_NAME_LENGTH)) {
    return { error: `Enter a given and family name of up to ${MAX_NAME_LENGTH} characters.` };
  }
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_SHAPE.test(email)) {
    return { error: 'Enter a valid email address.' };
  }
  return { details: { email, givenName, familyName } };
}

function isWithin(value: string, max: number): boolean {
  return value.length > 0 && value.length <= max;
}
