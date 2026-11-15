import { describe, expect, it } from 'vitest';

import { normalizeEmail } from '#src/users/email.ts';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Dad@Example.COM ')).toBe('dad@example.com');
  });
});
