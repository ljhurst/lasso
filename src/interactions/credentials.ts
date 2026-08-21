import { createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

import { env } from '../env.ts';

const scryptAsync = promisify(scrypt);
const SCRYPT_KEY_LENGTH = 64;

interface StoredCredential {
  username: string;
  salt: string;
  hash: string;
}

const ssmClient = new SSMClient({});

let cachedCredential: StoredCredential | undefined;

async function getStoredCredential(): Promise<StoredCredential> {
  if (cachedCredential) {
    return cachedCredential;
  }

  const result = await ssmClient.send(
    new GetParameterCommand({ Name: env.credentialSsmParam, WithDecryption: true }),
  );
  if (!result.Parameter?.Value) {
    throw new Error(`parameter ${env.credentialSsmParam} has no credential value yet`);
  }

  cachedCredential = JSON.parse(result.Parameter.Value) as StoredCredential;
  return cachedCredential;
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export async function scryptHash(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const stored = await getStoredCredential();

  const usernameMatches = timingSafeEqual(sha256(username), sha256(stored.username));

  const salt = Buffer.from(stored.salt, 'hex');
  const storedHash = Buffer.from(stored.hash, 'hex');
  const candidateHash = await scryptHash(password, salt);
  const passwordMatches =
    candidateHash.length === storedHash.length && timingSafeEqual(candidateHash, storedHash);

  return usernameMatches && passwordMatches;
}
