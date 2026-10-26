import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';

process.env.LASSO_OIDC_TABLE_NAME ??= 'lj-lasso-test';
process.env.LASSO_USERS_TABLE_NAME ??= 'lj-lasso-users-test';
process.env.LASSO_JWKS_SSM_PARAM ??= '/lasso/jwks-test';
process.env.LASSO_COOKIE_KEY_SSM_PARAM ??= '/lasso/cookie-key-test';
process.env.LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM ??=
  '/lasso/porto-victoria-client-secret-test';
process.env.LASSO_ISSUER ??= 'https://lasso.example.com';

const { listGrants } = await import('#src/portal/admin/data.ts');
const { primaryKey } = await import('#src/adapter/keys.ts');

const ddbMock = mockClient(DynamoDBDocumentClient);

function grantItem(id: string) {
  return { pk: primaryKey('Grant', id), id, modelName: 'Grant', payload: { accountId: 'sub-1' } };
}

beforeEach(() => {
  ddbMock.reset();
});

describe('listGrants', () => {
  it('follows the scan across every page', async () => {
    const pageBreak = { pk: primaryKey('Grant', 'g-1') };
    ddbMock
      .on(ScanCommand)
      .resolvesOnce({ Items: [grantItem('g-1')], LastEvaluatedKey: pageBreak })
      .resolvesOnce({ Items: [grantItem('g-2')] });

    const grants = await listGrants();

    expect(grants.map((g) => g.id)).toEqual(['g-1', 'g-2']);
    expect(ddbMock.commandCalls(ScanCommand)[1]?.args[0].input.ExclusiveStartKey).toEqual(
      pageBreak,
    );
  });
});
