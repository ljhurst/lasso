import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '#src/users/password.ts';

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
