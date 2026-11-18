import Provider from 'oidc-provider';
import { describe, expect, it } from 'vitest';
import { applyResourceConsent } from '#src/interactions/consent.ts';

describe('applyResourceConsent', () => {
  const indicator = 'https://porto.example.com/';
  const requested = { [indicator]: ['porto:read', 'porto:write'] };

  function newGrant() {
    const provider = new Provider('https://lasso.example.com', {});
    return new provider.Grant({ accountId: 'user-1', clientId: 'mcp-inspector' });
  }

  it('grants the held scope and records the unheld one so consent is not requested again', () => {
    const grant = newGrant();

    const { grantedAny } = applyResourceConsent(grant, requested, ['porto:read']);

    expect(grantedAny).toBe(true);
    expect(grant.getResourceScope(indicator)).toBe('porto:read');
    // the predicate oidc-provider's rs_scopes_missing check uses to decide whether to prompt again
    const encountered = new Set(grant.getResourceScopeEncountered(indicator).split(' '));
    expect(encountered).toEqual(new Set(['porto:read', 'porto:write']));
  });

  it('grants every scope when the account holds them all', () => {
    const grant = newGrant();

    const { grantedAny } = applyResourceConsent(grant, requested, ['porto:read', 'porto:write']);

    expect(grantedAny).toBe(true);
    expect(grant.getResourceScope(indicator).split(' ').sort()).toEqual([
      'porto:read',
      'porto:write',
    ]);
  });

  it('reports nothing granted when the account holds none of the requested scopes', () => {
    const grant = newGrant();

    const { grantedAny } = applyResourceConsent(grant, requested, []);

    expect(grantedAny).toBe(false);
    expect(grant.getResourceScope(indicator)).toBe('');
  });
});
