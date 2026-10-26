import { describe, expect, it } from 'vitest';

import {
  hashPassword,
  passwordPolicyError,
  rejectPassword,
  verifyPassword,
} from '#src/users/password.ts';

describe('hashPassword / verifyPassword', () => {
  it('accepts the correct password', async () => {
    const stored = await hashPassword('correct-horse');
    expect(await verifyPassword('correct-horse', stored)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('correct-horse');
    expect(await verifyPassword('wrong', stored)).toBe(false);
  });

  it('salts each hash differently', async () => {
    const a = await hashPassword('correct-horse');
    const b = await hashPassword('correct-horse');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('passwordPolicyError', () => {
  it('rejects a password under 12 characters', () => {
    expect(passwordPolicyError('a'.repeat(11))).toBe('Use 12 to 256 characters');
  });

  it('accepts a password of exactly 12 characters', () => {
    expect(passwordPolicyError('a'.repeat(12))).toBeUndefined();
  });

  it('accepts a password of exactly 256 characters', () => {
    expect(passwordPolicyError('a'.repeat(256))).toBeUndefined();
  });

  it('rejects a password over 256 characters', () => {
    expect(passwordPolicyError('a'.repeat(257))).toBe('Use 12 to 256 characters');
  });
});

describe('rejectPassword', () => {
  it('always resolves false', async () => {
    expect(await rejectPassword('anything at all')).toBe(false);
  });
});
