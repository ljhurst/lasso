import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type Provider from 'oidc-provider';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { primaryKey } from '#src/adapter/keys.ts';
import {
  revokeAllAccess,
  revokeClientAccess,
  revokeResourceAccess,
  revokeResourceScopes,
  revokeGrantsRejectingScope,
  revokeGrantsWithScope,
} from '#src/portal/admin/revocation.ts';
import { FIFE, grantRow, PORTO, stubGrant, stubProvider } from './support.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('revokeGrantsWithScope', () => {
  it("revokes only the account's grants that include the scope", async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        grantRow('g-fife', 'sub-1'),
        grantRow('g-porto', 'sub-1'),
        grantRow('g-other', 'sub-2'),
      ],
    });
    const calls: string[] = [];
    const grants = {
      'g-fife': stubGrant('g-fife', { [FIFE]: 'fife:read fife:write' }, calls),
      'g-porto': stubGrant('g-porto', { [PORTO]: 'porto:read' }, calls),
      'g-other': stubGrant('g-other', { [FIFE]: 'fife:read' }, calls),
    };

    await revokeGrantsWithScope(stubProvider(grants, calls), 'sub-1', 'fife:read');

    expect(calls).toEqual([
      'revoke-at:g-fife',
      'revoke-code:g-fife',
      'revoke-rt:g-fife',
      'destroy:g-fife',
    ]);
  });

  it('skips grants that no longer exist', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [grantRow('g-gone', 'sub-1')] });
    const calls: string[] = [];

    await revokeGrantsWithScope(stubProvider({}, calls), 'sub-1', 'fife:read');

    expect(calls).toEqual([]);
  });

  it('leaves grants without resource scopes alone', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [grantRow('g-oidc', 'sub-1')] });
    const calls: string[] = [];
    const grants = { 'g-oidc': stubGrant('g-oidc', {}, calls) };

    await revokeGrantsWithScope(stubProvider(grants, calls), 'sub-1', 'fife:read');

    expect(calls).toEqual([]);
  });
});

describe('revokeGrantsRejectingScope', () => {
  it("revokes only the account's grants that rejected the scope", async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        grantRow('g-rejected', 'sub-1'),
        grantRow('g-granted', 'sub-1'),
        grantRow('g-other', 'sub-2'),
      ],
    });
    const calls: string[] = [];
    const grants = {
      'g-rejected': stubGrant('g-rejected', { [PORTO]: 'porto:read' }, calls, {
        [PORTO]: 'porto:write',
      }),
      'g-granted': stubGrant('g-granted', { [PORTO]: 'porto:read porto:write' }, calls),
      'g-other': stubGrant('g-other', { [PORTO]: 'porto:read' }, calls, { [PORTO]: 'porto:write' }),
    };

    await revokeGrantsRejectingScope(stubProvider(grants, calls), 'sub-1', 'porto:write');

    expect(calls).toEqual([
      'revoke-at:g-rejected',
      'revoke-code:g-rejected',
      'revoke-rt:g-rejected',
      'destroy:g-rejected',
    ]);
  });

  it('leaves grants that rejected a different scope alone', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [grantRow('g-1', 'sub-1')] });
    const calls: string[] = [];
    const grants = {
      'g-1': stubGrant('g-1', { [PORTO]: 'porto:write' }, calls, { [PORTO]: 'porto:read' }),
    };

    await revokeGrantsRejectingScope(stubProvider(grants, calls), 'sub-1', 'porto:write');

    expect(calls).toEqual([]);
  });
});

describe('revokeAllAccess', () => {
  function sessionRow(id: string, accountId: string) {
    return { pk: primaryKey('Session', id), id, modelName: 'Session', payload: { accountId } };
  }

  function stubSessionProvider(
    sessions: string[],
    grants: Record<string, ReturnType<typeof stubGrant>>,
    calls: string[],
  ) {
    const base = stubProvider(grants, calls) as unknown as Record<string, unknown>;
    return {
      ...base,
      Session: {
        find: vi.fn(async (id: string) =>
          sessions.includes(id)
            ? {
                destroy: async () => {
                  calls.push(`end-session:${id}`);
                },
              }
            : undefined,
        ),
      },
    } as unknown as Provider;
  }

  function scanByModel(rows: Record<string, unknown[]>) {
    ddbMock.on(ScanCommand).callsFake(async (input) => ({
      Items: rows[input.ExpressionAttributeValues[':modelName']] ?? [],
    }));
  }

  it("ends the account's sessions, then revokes all of its grants", async () => {
    scanByModel({
      Session: [sessionRow('s-1', 'sub-1'), sessionRow('s-other', 'sub-2')],
      Grant: [grantRow('g-1', 'sub-1'), grantRow('g-other', 'sub-2')],
    });
    const calls: string[] = [];
    const grants = {
      'g-1': stubGrant('g-1', { [FIFE]: 'fife:read' }, calls),
      'g-other': stubGrant('g-other', { [FIFE]: 'fife:read' }, calls),
    };

    await revokeAllAccess(stubSessionProvider(['s-1', 's-other'], grants, calls), 'sub-1');

    expect(calls).toEqual([
      'end-session:s-1',
      'revoke-at:g-1',
      'revoke-code:g-1',
      'revoke-rt:g-1',
      'destroy:g-1',
    ]);
  });

  it('revokes a grant that carries no resource scopes', async () => {
    scanByModel({ Session: [], Grant: [grantRow('g-oidc', 'sub-1')] });
    const calls: string[] = [];
    const grants = { 'g-oidc': stubGrant('g-oidc', {}, calls) };

    await revokeAllAccess(stubSessionProvider([], grants, calls), 'sub-1');

    expect(calls).toContain('destroy:g-oidc');
  });

  it('skips a session that has already expired', async () => {
    scanByModel({ Session: [sessionRow('s-gone', 'sub-1')], Grant: [] });
    const calls: string[] = [];

    await revokeAllAccess(stubSessionProvider([], {}, calls), 'sub-1');

    expect(calls).toEqual([]);
  });
});

describe('revokeClientAccess', () => {
  it("revokes every account's grants for the client and destroys its own tokens", async () => {
    ddbMock.on(ScanCommand).callsFake((input) => {
      if (input.ExpressionAttributeValues[':modelName'] === 'Grant') {
        return {
          Items: [
            { ...grantRow('g-1', 'sub-1'), payload: { accountId: 'sub-1', clientId: 'my-app' } },
            { ...grantRow('g-2', 'sub-2'), payload: { accountId: 'sub-2', clientId: 'my-app' } },
            { ...grantRow('g-3', 'sub-1'), payload: { accountId: 'sub-1', clientId: 'other' } },
          ],
        };
      }
      return {
        Items: [
          {
            pk: primaryKey('AccessToken', 't-1'),
            id: 't-1',
            modelName: 'AccessToken',
            payload: { clientId: 'my-app' },
          },
          {
            pk: primaryKey('AccessToken', 't-2'),
            id: 't-2',
            modelName: 'AccessToken',
            payload: { clientId: 'other' },
          },
        ],
      };
    });
    const calls: string[] = [];
    const grants = {
      'g-1': stubGrant('g-1', { [FIFE]: 'fife:read' }, calls),
      'g-2': stubGrant('g-2', { [FIFE]: 'fife:read' }, calls),
      'g-3': stubGrant('g-3', { [FIFE]: 'fife:read' }, calls),
    };
    const provider = stubProvider(grants, calls) as unknown as {
      AccessToken: Record<string, unknown>;
    };
    provider.AccessToken.find = vi.fn(async (id: string) => ({
      destroy: async () => {
        calls.push(`destroy-token:${id}`);
      },
    }));

    await revokeClientAccess(provider as unknown as Provider, 'my-app');

    expect(calls).toEqual([
      'revoke-at:g-1',
      'revoke-code:g-1',
      'revoke-rt:g-1',
      'destroy:g-1',
      'revoke-at:g-2',
      'revoke-code:g-2',
      'revoke-rt:g-2',
      'destroy:g-2',
      'destroy-token:t-1',
    ]);
  });
});

describe('revokeResourceAccess', () => {
  it("revokes every account's grant that reaches the resource and no other", async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [grantRow('g-1', 'sub-1'), grantRow('g-2', 'sub-2'), grantRow('g-3', 'sub-1')],
    });
    const calls: string[] = [];
    const grants = {
      'g-1': stubGrant('g-1', { [FIFE]: 'fife:read' }, calls),
      'g-2': stubGrant('g-2', { [FIFE]: 'fife:write', [PORTO]: 'porto:read' }, calls),
      'g-3': stubGrant('g-3', { [PORTO]: 'porto:read' }, calls),
    };

    await revokeResourceAccess(stubProvider(grants, calls), FIFE);

    expect(calls.filter((c) => c.startsWith('destroy'))).toEqual(['destroy:g-1', 'destroy:g-2']);
  });
});

describe('revokeResourceScopes', () => {
  it('revokes only grants that hold one of the removed scopes on that resource', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [grantRow('g-1', 'sub-1'), grantRow('g-2', 'sub-2'), grantRow('g-3', 'sub-3')],
    });
    const calls: string[] = [];
    const grants = {
      'g-1': stubGrant('g-1', { [FIFE]: 'fife:read fife:write' }, calls),
      'g-2': stubGrant('g-2', { [FIFE]: 'fife:read' }, calls),
      'g-3': stubGrant('g-3', { [PORTO]: 'fife:write' }, calls),
    };

    await revokeResourceScopes(stubProvider(grants, calls), FIFE, ['fife:write']);

    expect(calls.filter((c) => c.startsWith('destroy'))).toEqual(['destroy:g-1']);
  });
});
