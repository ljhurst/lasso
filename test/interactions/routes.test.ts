import { describe, expect, it } from 'vitest';
import { filterGrantedScope } from '#src/interactions/routes.ts';

describe('filterGrantedScope', () => {
  it('grants every requested scope the account has a matching role for', () => {
    const granted = filterGrantedScope(
      ['fife:read', 'fife:write', 'fife:admin'],
      ['fife:read', 'fife:write', 'fife:admin'],
    );
    expect(granted).toEqual(['fife:read', 'fife:write', 'fife:admin']);
  });

  it('drops requested scopes the account has no matching role for', () => {
    const granted = filterGrantedScope(
      ['fife:read', 'fife:write', 'fife:admin'],
      ['fife:read', 'fife:write'],
    );
    expect(granted).toEqual(['fife:read', 'fife:write']);
  });

  it('grants nothing when the account has no matching roles', () => {
    const granted = filterGrantedScope(['fife:read', 'fife:write'], []);
    expect(granted).toEqual([]);
  });
});
