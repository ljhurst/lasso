import { describe, expect, it } from 'vitest';
import { toClientMetadata } from '#src/clients/metadata.ts';
import { makeClient, makeMachineClient } from '#test/support/clients.ts';

describe('toClientMetadata', () => {
  it('maps a sign-in client and omits empty optional fields', () => {
    expect(toClientMetadata(makeClient())).toEqual({
      client_id: 'my-app',
      client_name: 'My App',
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      redirect_uris: ['https://app.example.com/callback'],
      application_type: 'web',
    });
  });

  it('includes post-logout uris when set', () => {
    const metadata = toClientMetadata(
      makeClient({ postLogoutRedirectUris: ['https://app.example.com/'] }),
    );

    expect(metadata.post_logout_redirect_uris).toEqual(['https://app.example.com/']);
  });

  it('maps a machine client with its secret and no response types', () => {
    expect(toClientMetadata(makeMachineClient(), 's3cret')).toEqual({
      client_id: 'my-service',
      client_name: 'My App',
      token_endpoint_auth_method: 'client_secret_basic',
      grant_types: ['client_credentials'],
      response_types: [],
      scope: 'victoria:read',
      client_secret: 's3cret',
    });
  });

  it('never exposes the secret parameter name', () => {
    expect(JSON.stringify(toClientMetadata(makeMachineClient(), 's3cret'))).not.toContain(
      '/lasso/client/',
    );
  });
});
