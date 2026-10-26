import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import type Provider from 'oidc-provider';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.LASSO_OIDC_TABLE_NAME ??= 'lj-lasso-test';
process.env.LASSO_USERS_TABLE_NAME ??= 'lj-lasso-users-test';
process.env.LASSO_JWKS_SSM_PARAM ??= '/lasso/jwks-test';
process.env.LASSO_COOKIE_KEY_SSM_PARAM ??= '/lasso/cookie-key-test';
process.env.LASSO_THROTTLE_TABLE_NAME ??= 'lj-lasso-throttle-test';
process.env.LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM ??=
  '/lasso/porto-victoria-client-secret-test';
process.env.LASSO_ISSUER ??= 'https://lasso.example.com';

const { revokeGrantsWithScope } = await import('#src/portal/admin/revocation.ts');
const { primaryKey } = await import('#src/adapter/keys.ts');

const ddbMock = mockClient(DynamoDBDocumentClient);

const FIFE = 'https://fife.example.com';
const PORTO = 'https://porto.example.com';

function grantRow(id: string, accountId: string) {
  return { pk: primaryKey('Grant', id), id, modelName: 'Grant', payload: { accountId } };
}

function stubGrant(jti: string, resources: Record<string, string>, calls: string[]) {
  return {
    jti,
    resources,
    getResourceScope: (indicator: string) => resources[indicator] ?? '',
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
