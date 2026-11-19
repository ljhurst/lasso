import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDocClient, scanAll } from '#src/aws/dynamo.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);
const db = createDocClient();

beforeEach(() => {
  ddbMock.reset();
});

describe('scanAll', () => {
  it('returns the items of a single page', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [{ id: 'a' }, { id: 'b' }] });

    expect(await scanAll(db, { TableName: 't' })).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(1);
  });

  it('follows the last evaluated key until the table is read', async () => {
    ddbMock
      .on(ScanCommand)
      .resolvesOnce({ Items: [{ id: 'a' }], LastEvaluatedKey: { id: 'a' } })
      .resolvesOnce({ Items: [{ id: 'b' }], LastEvaluatedKey: { id: 'b' } })
      .resolvesOnce({ Items: [{ id: 'c' }] });

    expect(await scanAll(db, { TableName: 't' })).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

    const starts = ddbMock
      .commandCalls(ScanCommand)
      .map((call) => call.args[0].input.ExclusiveStartKey);
    expect(starts).toEqual([undefined, { id: 'a' }, { id: 'b' }]);
  });

  it('keeps the caller filter on every page and returns nothing for an empty table', async () => {
    ddbMock.on(ScanCommand).resolves({});

    expect(await scanAll(db, { TableName: 't', FilterExpression: 'x = :x' })).toEqual([]);
    expect(ddbMock.commandCalls(ScanCommand)[0]?.args[0].input).toMatchObject({
      TableName: 't',
      FilterExpression: 'x = :x',
    });
  });
});

describe('createDocClient', () => {
  it('drops undefined attributes instead of failing to marshal them', async () => {
    const config = createDocClient().config as unknown as {
      translateConfig?: { marshallOptions?: { removeUndefinedValues?: boolean } };
    };

    expect(config.translateConfig?.marshallOptions?.removeUndefinedValues).toBe(true);
  });
});
