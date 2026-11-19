import { describe, expect, it } from 'vitest';
import type { ClientRecord } from '#src/clients/types.ts';
import { validateClient } from '#src/clients/validate.ts';
import { makeClient, makeConfidentialClient } from '#test/support/clients.ts';

const SCOPES = ['victoria:read', 'victoria:write'];

const publicClient = (overrides: Parameters<typeof makeClient>[0] = {}) => makeClient(overrides);
const confidentialClient = (overrides: Parameters<typeof makeConfidentialClient>[0] = {}) =>
  makeConfidentialClient(overrides);

const validate = (record: ClientRecord, scopes: readonly string[]) =>
  validateClient(record.clientId, record.metadata, scopes);

describe('validateClient', () => {
  it('accepts a public client and a confidential client', () => {
    expect(validate(publicClient(), SCOPES)).toBeUndefined();
    expect(validate(confidentialClient(), SCOPES)).toBeUndefined();
  });

  it.each(['A', 'x', '-app', 'my_app', 'My-App', 'a'.repeat(64)])(
    'rejects the client id %j',
    (client_id) => {
      expect(validate(publicClient({ client_id }), SCOPES)).toMatch(/Client ID/);
    },
  );

  it('rejects an empty or over-long name', () => {
    expect(validate(publicClient({ client_name: '' }), SCOPES)).toMatch(/Name/);
    expect(validate(publicClient({ client_name: 'n'.repeat(101) }), SCOPES)).toMatch(/Name/);
  });

  it.each([
    'http://app.example.com/callback',
    'javascript:alert(1)',
    'https://app.example.com/callback#frag',
    'https://user:pw@app.example.com/callback',
    'http://localhost.evil.com/callback',
    'not a url',
  ])('rejects the redirect uri %j', (uri) => {
    expect(validate(publicClient({ redirect_uris: [uri] }), SCOPES)).toMatch(/not allowed/);
  });

  it.each(['http://localhost:8080/cb', 'http://127.0.0.1:6274/cb', 'http://[::1]:3000/cb'])(
    'accepts the loopback redirect uri %j',
    (uri) => {
      expect(validate(publicClient({ redirect_uris: [uri] }), SCOPES)).toBeUndefined();
    },
  );

  it('rejects an unsafe post-logout uri', () => {
    expect(
      validate(publicClient({ post_logout_redirect_uris: ['http://evil.example.com/'] }), SCOPES),
    ).toMatch(/not allowed/);
  });

  it('requires a redirect uri for the code flow and forbids them otherwise', () => {
    expect(validate(publicClient({ redirect_uris: [] }), SCOPES)).toMatch(/at least one/);
    expect(validate(publicClient({ redirect_uris: undefined }), SCOPES)).toMatch(/at least one/);
    expect(
      validate(confidentialClient({ redirect_uris: ['https://a.example.com/'] }), SCOPES),
    ).toMatch(/Only clients that sign users in/);
  });

  it('caps the number of redirect uris', () => {
    const redirect_uris = Array.from({ length: 11 }, (_, i) => `https://a.example.com/${i}`);
    expect(validate(publicClient({ redirect_uris }), SCOPES)).toMatch(/at most 10/);
  });

  it('rejects a refresh grant without the code grant, and a mix with client credentials', () => {
    expect(validate(publicClient({ grant_types: ['refresh_token'] }), SCOPES)).toMatch(
      /Refresh tokens/,
    );
    expect(
      validate(publicClient({ grant_types: ['authorization_code', 'client_credentials'] }), SCOPES),
    ).toMatch(/not both/);
  });

  it('keeps public and confidential clients to their own grant', () => {
    expect(validate(confidentialClient({ token_endpoint_auth_method: 'none' }), SCOPES)).toMatch(
      /need a secret/,
    );
    expect(
      validate(publicClient({ token_endpoint_auth_method: 'client_secret_basic' }), SCOPES),
    ).toMatch(/public and use PKCE/);
  });

  it('requires known scopes for client credentials', () => {
    expect(validate(confidentialClient({ scope: undefined }), SCOPES)).toMatch(/scopes/);
    expect(validate(confidentialClient({ scope: 'lasso:root' }), SCOPES)).toMatch(/scopes/);
  });
});
