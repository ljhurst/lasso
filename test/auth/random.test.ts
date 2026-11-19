import { describe, expect, it } from 'vitest';
import { randomToken } from '#src/auth/random.ts';

describe('randomToken', () => {
  it('encodes 32 random bytes by default, as unpadded base64url', () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('encodes the number of bytes asked for', () => {
    expect(randomToken(16)).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(randomToken(48)).toMatch(/^[A-Za-z0-9_-]{64}$/);
  });

  it('does not repeat', () => {
    expect(new Set(Array.from({ length: 50 }, () => randomToken())).size).toBe(50);
  });
});
