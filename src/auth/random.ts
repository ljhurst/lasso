import { randomBytes } from 'node:crypto';

/** An unguessable URL-safe string made of `bytes` random bytes. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
