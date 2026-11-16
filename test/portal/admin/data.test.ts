import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { primaryKey } from '#src/adapter/keys.ts';
import { byLatestExpiry, listGrants, listSessions } from '#src/portal/admin/data.ts';

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

describe('listSessions', () => {
  function sessionItem(payload: Record<string, unknown>) {
    return {
      pk: primaryKey('Session', 's-1'),
      id: 's-1',
      modelName: 'Session',
      expiresAt: 1_800_000_000,
      payload: { accountId: 'sub-1', ...payload },
    };
  }

  it('reports the apps a session signed in to and when it started', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        sessionItem({
          loginTs: 1_799_000_000,
          authorizations: { freal: { sid: 'a' }, 'lasso-portal': { sid: 'b' } },
        }),
      ],
    });

    const [session] = await listSessions();

    expect(session).toMatchObject({
      id: 's-1',
      accountId: 'sub-1',
      clientIds: ['freal', 'lasso-portal'],
      loginTs: 1_799_000_000,
      expiresAt: 1_800_000_000,
    });
  });

  it('reports no apps for a session that has not signed in to any', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [sessionItem({})] });

    const [session] = await listSessions();

    expect(session?.clientIds).toEqual([]);
  });
});

describe('byLatestExpiry', () => {
  it('puts the row that expires last first', () => {
    const rows = [{ expiresAt: 100 }, { expiresAt: 300 }, { expiresAt: 200 }];

    expect(rows.sort(byLatestExpiry).map((r) => r.expiresAt)).toEqual([300, 200, 100]);
  });

  it('puts rows with no expiry last', () => {
    const rows = [{ id: 'none' }, { id: 'old', expiresAt: 100 }, { id: 'new', expiresAt: 300 }];

    expect(rows.sort(byLatestExpiry).map((r) => r.id)).toEqual(['new', 'old', 'none']);
  });

  it('keeps rows with the same expiry in their original order', () => {
    const rows = [
      { id: 'a', expiresAt: 100 },
      { id: 'b', expiresAt: 100 },
      { id: 'c' },
      { id: 'd' },
    ];

    expect(rows.sort(byLatestExpiry).map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
