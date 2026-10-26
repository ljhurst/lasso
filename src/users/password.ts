import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 256;
const SCRYPT_KEY_LENGTH = 64;
const DUMMY_SALT = Buffer.alloc(16);

export interface PasswordHash {
  hash: string;
  salt: string;
}

async function scryptHash(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = randomBytes(16);
  const hash = await scryptHash(password, salt);
  return { hash: hash.toString('hex'), salt: salt.toString('hex') };
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const salt = Buffer.from(stored.salt, 'hex');
  const storedHash = Buffer.from(stored.hash, 'hex');
  const candidateHash = await scryptHash(password, salt);
  return candidateHash.length === storedHash.length && timingSafeEqual(candidateHash, storedHash);
}

export function passwordPolicyError(password: string): string | undefined {
  const withinLimits =
    password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
  return withinLimits
    ? undefined
    : `Use ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters`;
}

/** Spends the same time as a real check, so a rejected login can't be told apart by timing. */
export async function rejectPassword(password: string): Promise<false> {
  await scryptHash(password, DUMMY_SALT);
  return false;
}
