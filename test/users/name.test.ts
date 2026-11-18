import { describe, expect, it } from 'vitest';
import { fullName } from '#src/users/name.ts';

describe('fullName', () => {
  it('joins the given and family names', () => {
    expect(fullName({ givenName: 'Friend', familyName: 'Person' })).toBe('Friend Person');
  });
});
