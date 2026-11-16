import Provider from 'oidc-provider';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachProviderEvents } from '#src/observability/provider-events.ts';

function newProvider() {
  const provider = new Provider('https://lasso.example.com', {});
  attachProviderEvents(provider);
  return provider;
}

function logged(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.map(([line]) => JSON.parse(line as string));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('attachProviderEvents', () => {
  it('logs a token issuance with client, account and grant type', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    newProvider().emit('grant.success', {
      oidc: {
        client: { clientId: 'freal' },
        entities: { AccessToken: { accountId: 'sub-1' } },
        params: { grant_type: 'authorization_code' },
      },
    });

    expect(logged(spy)).toEqual([
      { event: 'token_issued', clientId: 'freal', sub: 'sub-1', grantType: 'authorization_code' },
    ]);
  });

  it.each([
    ['grant.error', 'grant'],
    ['authorization.error', 'authorization'],
    ['server_error', 'server'],
  ])('logs %s as an oidc_error of kind %s', (name, kind) => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    newProvider().emit(name, { oidc: { client: { clientId: 'freal' } } }, new Error('nope'));

    expect(logged(spy)).toEqual([
      { event: 'oidc_error', kind, clientId: 'freal', message: 'nope' },
    ]);
  });
});
