import { describe, expect, it } from 'vitest';
import { partitionScopeByRoles } from '#src/users/access.ts';

describe('partitionScopeByRoles', () => {
  it('grants every requested scope the account has a matching role for', () => {
    const result = partitionScopeByRoles(
      ['fife:read', 'fife:write', 'fife:admin'],
      ['fife:read', 'fife:write', 'fife:admin'],
    );
    expect(result).toEqual({ granted: ['fife:read', 'fife:write', 'fife:admin'], denied: [] });
  });

  it('denies requested scopes the account has no matching role for', () => {
    const result = partitionScopeByRoles(
      ['fife:read', 'fife:write', 'fife:admin'],
      ['fife:read', 'fife:write'],
    );
    expect(result).toEqual({ granted: ['fife:read', 'fife:write'], denied: ['fife:admin'] });
  });

  it('grants nothing when the account has no matching roles', () => {
    const result = partitionScopeByRoles(['fife:read', 'fife:write'], []);
    expect(result).toEqual({ granted: [], denied: ['fife:read', 'fife:write'] });
  });
});
