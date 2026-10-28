import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type Provider from 'oidc-provider';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { primaryKey } from '#src/adapter/keys.ts';
import { assignRole } from '#src/portal/admin/routes.ts';
import { revokeGrantsRejectingScope, revokeGrantsWithScope } from '#src/portal/admin/revocation.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

const FIFE = 'https://fife.example.com';
const PORTO = 'https://porto.example.com';

function grantRow(id: string, accountId: string) {
  return { pk: primaryKey('Grant', id), id, modelName: 'Grant', payload: { accountId } };
}

function stubGrant(
  jti: string,
  resources: Record<string, string>,
  calls: string[],
  rejected: Record<string, string> = {},
) {
  return {
    jti,
    resources,
    rejected: { resources: rejected },
    getResourceScope: (indicator: string) => resources[indicator] ?? '',
    getRejectedResourceScope: (indicator: string) => rejected[indicator] ?? '',
    destroy: vi.fn(async () => {
      calls.push(`destroy:${jti}`);
    }),
  };
}

function stubRevoker(label: string, calls: string[]) {
  return {
    revokeByGrantId: vi.fn(async (grantId: string) => {
      calls.push(`${label}:${grantId}`);
    }),
  };
}

function stubProvider(grants: Record<string, ReturnType<typeof stubGrant>>, calls: string[]) {
  return {
    Grant: { find: vi.fn(async (id: string) => grants[id]) },
    AccessToken: stubRevoker('revoke-at', calls),
    AuthorizationCode: stubRevoker('revoke-code', calls),
    RefreshToken: stubRevoker('revoke-rt', calls),
  } as unknown as Provider;
}

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

describe('assignRole', () => {
  it('adds the role before revoking the grants that rejected it', async () => {
    const calls: string[] = [];
    ddbMock.on(GetCommand).resolves({ Item: { sub: 'sub-1', roles: ['porto:read'] } });
    ddbMock.on(UpdateCommand).callsFake(async () => {
      calls.push('add-role');
    });
    ddbMock.on(ScanCommand).resolves({ Items: [grantRow('g-1', 'sub-1')] });
    const grants = {
      'g-1': stubGrant('g-1', { [PORTO]: 'porto:read' }, calls, { [PORTO]: 'porto:write' }),
    };

    await assignRole(stubProvider(grants, calls), 'sub-1', 'porto:write');

    expect(calls).toEqual([
      'add-role',
      'revoke-at:g-1',
      'revoke-code:g-1',
      'revoke-rt:g-1',
      'destroy:g-1',
    ]);
  });
});
