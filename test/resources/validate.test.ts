import { describe, expect, it } from 'vitest';
import type { ResourceApp } from '#src/resources/types.ts';
import { validateResource } from '#src/resources/validate.ts';
import { makeResource } from '#test/support/resources.ts';

const RESERVED = { scopes: ['lasso:admin'], resources: ['https://lasso.example.com'] };

const check = (overrides: Parameters<typeof makeResource>[0] = {}, app?: ResourceApp) =>
  validateResource(makeResource(overrides).metadata, app, RESERVED);

describe('validateResource', () => {
  it('accepts a resource with scopes and an app link', () => {
    expect(check({}, { type: 'mcp', url: 'https://api.example.com/mcp' })).toBeUndefined();
  });

  it.each([
    'http://api.example.com/',
    'ftp://api.example.com/',
    'javascript:alert(1)',
    'https://api.example.com/#frag',
    'https://user:pw@api.example.com/',
    'api.example.com',
    '',
  ])('rejects the resource %j', (resource) => {
    expect(check({ resource })).toMatch(/https URL/);
  });

  it.each(['http://localhost:3000/', 'http://127.0.0.1:8000/api'])(
    'accepts the loopback resource %j',
    (resource) => {
      expect(check({ resource })).toBeUndefined();
    },
  );

  it("refuses Lasso's own resource", () => {
    expect(check({ resource: 'https://lasso.example.com' })).toMatch(/belongs to Lasso/);
  });

  it('rejects an empty or over-long name', () => {
    expect(check({ resource_name: '' })).toMatch(/Name/);
    expect(check({ resource_name: 'n'.repeat(101) })).toMatch(/Name/);
  });

  it('needs at least one scope and at most twenty', () => {
    expect(check({ scopes_supported: [] })).toMatch(/1-20 scopes/);
    const many = Array.from({ length: 21 }, (_, i) => `x:a${i}`);
    expect(check({ scopes_supported: many })).toMatch(/1-20 scopes/);
  });

  it.each(['Read', 'read', 'a:B', 'a b:c', 'a:', ':a', 'a:b:c', '1a:read', 'openid'])(
    'rejects the scope %j',
    (scope) => {
      expect(check({ scopes_supported: [scope] })).toMatch(/project:action/);
    },
  );

  it('rejects a repeated scope and a scope Lasso owns', () => {
    expect(check({ scopes_supported: ['a:read', 'a:read'] })).toMatch(/once/);
    expect(check({ scopes_supported: ['lasso:admin'] })).toMatch(/belongs to Lasso/);
  });

  it('rejects an app link that is not https or loopback', () => {
    expect(check({}, { type: 'web', url: 'http://evil.example.com/' })).toMatch(/app link/);
    expect(check({}, { type: 'web', url: 'javascript:alert(1)' })).toMatch(/app link/);
    expect(check({}, { type: 'web' })).toBeUndefined();
  });
});
