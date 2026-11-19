import { describe, expect, it } from 'vitest';
import { parseNewResource, parseResourceEdits } from '#src/resources/form.ts';

describe('parseNewResource', () => {
  it('reads every field, trimming and splitting scopes however they are separated', () => {
    const form = new URLSearchParams({
      resource: ' https://api.example.com/ ',
      name: ' Example ',
      scopes: 'a:read, a:write\nb:read   a:read',
      appType: 'mcp',
      appUrl: ' https://api.example.com/mcp ',
    });

    expect(parseNewResource(form)).toEqual({
      resource: 'https://api.example.com/',
      name: 'Example',
      scopes: ['a:read', 'a:write', 'b:read'],
      appType: 'mcp',
      appUrl: 'https://api.example.com/mcp',
    });
  });

  it('treats a missing or unknown app type as none', () => {
    expect(parseNewResource(new URLSearchParams()).appType).toBeUndefined();
    expect(parseNewResource(new URLSearchParams({ appType: 'admin' })).appType).toBeUndefined();
  });
});

describe('parseResourceEdits', () => {
  it('returns empty values for missing fields', () => {
    expect(parseResourceEdits(new URLSearchParams())).toEqual({
      name: '',
      scopes: [],
      appType: undefined,
      appUrl: '',
    });
  });
});
