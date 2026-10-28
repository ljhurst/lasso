import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type Koa from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Provider from 'oidc-provider';
import {
  applyResourceConsent,
  grantConsent,
  partitionScopeByRoles,
} from '#src/interactions/routes.ts';

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

describe('grantConsent', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const indicator = 'https://porto.example.com/';
  const ctx = { req: {}, res: {} } as unknown as Koa.Context;

  beforeEach(() => {
    ddbMock.reset();
  });

  function setup(roles: string[]) {
    ddbMock.on(GetCommand).resolves({ Item: { sub: 'user-1', roles } });
    const provider = new Provider('https://lasso.example.com', {});
    vi.spyOn(provider, 'interactionDetails').mockResolvedValue({
      session: { accountId: 'user-1' },
      params: { client_id: 'mcp-inspector' },
      prompt: {
        details: { missingResourceScopes: { [indicator]: ['porto:read', 'porto:write'] } },
      },
    } as never);
    const finished = vi
      .spyOn(provider, 'interactionFinished')
      .mockResolvedValue(undefined as never);
    const save = vi.spyOn(provider.Grant.prototype, 'save');
    return { provider, finished, save };
  }

  it('answers access_denied and saves no grant when the account holds none of the scopes', async () => {
    const { provider, finished, save } = setup([]);

    await grantConsent(provider, ctx);

    expect(finished).toHaveBeenCalledOnce();
    expect(finished.mock.calls[0]?.[2]).toMatchObject({ error: 'access_denied' });
    expect(save).not.toHaveBeenCalled();
  });

  it('saves a grant with the unheld scope rejected and finishes with consent', async () => {
    const { provider, finished, save } = setup(['porto:read']);

    await grantConsent(provider, ctx);

    expect(save).toHaveBeenCalledOnce();
    expect(finished.mock.calls[0]?.[2]).toHaveProperty('consent.grantId');
    const grant = save.mock.contexts[0] as InstanceType<typeof provider.Grant>;
    expect(grant.getResourceScope(indicator)).toBe('porto:read');
    expect(grant.getRejectedResourceScope(indicator)).toBe('porto:write');
  });
});
