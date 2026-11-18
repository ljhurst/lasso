import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type Koa from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Provider from 'oidc-provider';
import { grantConsent } from '#src/interactions/routes.ts';

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
