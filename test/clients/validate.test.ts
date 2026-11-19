import { describe, expect, it } from 'vitest';
import { validateClient } from '#src/clients/validate.ts';
import { makeClient, makeMachineClient } from '#test/support/clients.ts';

const SCOPES = ['victoria:read', 'victoria:write'];

describe('validateClient', () => {
  it('accepts a sign-in client and a machine client', () => {
    expect(validateClient(makeClient(), SCOPES)).toBeUndefined();
    expect(validateClient(makeMachineClient(), SCOPES)).toBeUndefined();
  });

  it.each(['A', 'x', '-app', 'my_app', 'My-App', 'a'.repeat(64)])(
    'rejects the client id %j',
    (clientId) => {
      expect(validateClient(makeClient({ clientId }), SCOPES)).toMatch(/Client ID/);
    },
  );

  it('rejects an empty or over-long name', () => {
    expect(validateClient(makeClient({ name: '' }), SCOPES)).toMatch(/Name/);
    expect(validateClient(makeClient({ name: 'n'.repeat(101) }), SCOPES)).toMatch(/Name/);
  });

  it.each([
    'http://app.example.com/callback',
    'javascript:alert(1)',
    'https://app.example.com/callback#frag',
    'https://user:pw@app.example.com/callback',
    'http://localhost.evil.com/callback',
    'not a url',
  ])('rejects the redirect uri %j', (uri) => {
    expect(validateClient(makeClient({ redirectUris: [uri] }), SCOPES)).toMatch(/not allowed/);
  });

  it.each(['http://localhost:8080/cb', 'http://127.0.0.1:6274/cb', 'http://[::1]:3000/cb'])(
    'accepts the loopback redirect uri %j',
    (uri) => {
      expect(validateClient(makeClient({ redirectUris: [uri] }), SCOPES)).toBeUndefined();
    },
  );

  it('rejects an unsafe post-logout uri', () => {
    expect(
      validateClient(makeClient({ postLogoutRedirectUris: ['http://evil.example.com/'] }), SCOPES),
    ).toMatch(/not allowed/);
  });

  it('requires a redirect uri for the code flow and forbids them otherwise', () => {
    expect(validateClient(makeClient({ redirectUris: [] }), SCOPES)).toMatch(/at least one/);
    expect(
      validateClient(makeMachineClient({ redirectUris: ['https://a.example.com/'] }), SCOPES),
    ).toMatch(/Only clients that sign users in/);
  });

  it('caps the number of redirect uris', () => {
    const redirectUris = Array.from({ length: 11 }, (_, i) => `https://a.example.com/${i}`);
    expect(validateClient(makeClient({ redirectUris }), SCOPES)).toMatch(/at most 10/);
  });

  it('rejects a refresh grant without the code grant, and a mix with client credentials', () => {
    expect(validateClient(makeClient({ grantTypes: ['refresh_token'] }), SCOPES)).toMatch(
      /Refresh tokens/,
    );
    expect(
      validateClient(
        makeClient({ grantTypes: ['authorization_code', 'client_credentials'] }),
        SCOPES,
      ),
    ).toMatch(/not both/);
  });

  it('rejects client credentials without a secret, a scope, or with an unknown scope', () => {
    expect(validateClient(makeMachineClient({ authMethod: 'none' }), SCOPES)).toMatch(
      /need a secret/,
    );
    expect(validateClient(makeMachineClient({ scope: undefined }), SCOPES)).toMatch(/scopes/);
    expect(validateClient(makeMachineClient({ scope: 'lasso:root' }), SCOPES)).toMatch(/scopes/);
  });

  it('only lets a client name its own secret parameter', () => {
    expect(
      validateClient(
        makeMachineClient({ secretSsmParam: '/lasso/client/porto-victoria-secret' }),
        SCOPES,
      ),
    ).toMatch(/must be \/lasso\/client\/my-service-secret/);
    expect(validateClient(makeMachineClient({ secretSsmParam: '/lasso/jwks' }), SCOPES)).toMatch(
      /must be/,
    );
  });

  it('keeps the secret parameter and the auth method consistent', () => {
    expect(validateClient(makeMachineClient({ secretSsmParam: undefined }), SCOPES)).toMatch(
      /secret parameter/,
    );
    expect(
      validateClient(makeClient({ secretSsmParam: '/lasso/client/my-app-secret' }), SCOPES),
    ).toMatch(/cannot have a secret/);
  });
});
