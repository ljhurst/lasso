import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const SCRYPT_KEY_LENGTH = 64;

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
