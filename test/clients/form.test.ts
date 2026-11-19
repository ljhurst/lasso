import { describe, expect, it } from 'vitest';
import { parseClientEdits, parseNewClient } from '#src/clients/form.ts';

describe('parseNewClient', () => {
  it('reads every field, trimming and splitting URIs by line', () => {
    const form = new URLSearchParams({
      clientId: ' my-app ',
      name: ' My App ',
      kind: 'service',
      applicationType: 'native',
      redirectUris:
        'https://a.example.com/\r\n\n  https://b.example.com/  \nhttps://a.example.com/',
      postLogoutRedirectUris: 'https://a.example.com/',
    });
    form.append('scope', 'victoria:read');
    form.append('scope', 'victoria:read');
    form.append('scope', 'victoria:write');

    expect(parseNewClient(form)).toEqual({
      clientId: 'my-app',
      name: 'My App',
      kind: 'service',
      applicationType: 'native',
      redirectUris: ['https://a.example.com/', 'https://b.example.com/'],
      postLogoutRedirectUris: ['https://a.example.com/'],
      scopes: ['victoria:read', 'victoria:write'],
    });
  });

  it('treats anything unrecognised as a web app', () => {
    expect(
      parseNewClient(new URLSearchParams({ kind: 'admin', applicationType: 'x' })),
    ).toMatchObject({ kind: 'app', applicationType: 'web', clientId: '', name: '' });
  });
});

describe('parseClientEdits', () => {
  it('returns empty lists for missing fields', () => {
    expect(parseClientEdits(new URLSearchParams())).toEqual({
      name: '',
      redirectUris: [],
      postLogoutRedirectUris: [],
      scopes: [],
    });
  });
});
