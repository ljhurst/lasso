import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createResourceStore } from '#src/resources/storage/store.ts';
import { makeResource } from '#test/support/resources.ts';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ddbMock = mockClient(db);
const store = createResourceStore(db, 'resources-table');
const record = makeResource();

beforeEach(() => {
  ddbMock.reset();
});

describe('resource store', () => {
  it('gets a resource by indicator from its table', async () => {
    ddbMock.on(GetCommand).resolves({ Item: record });

    expect(await store.get('https://api.example.com/')).toEqual(record);
    expect(ddbMock.commandCalls(GetCommand)[0]?.args[0].input).toMatchObject({
      TableName: 'resources-table',
      Key: { resource: 'https://api.example.com/' },
    });
  });

  it('returns undefined for an unknown resource', async () => {
    ddbMock.on(GetCommand).resolves({});

    expect(await store.get('https://nope.example.com/')).toBeUndefined();
  });

  it('lists resources sorted by name across every page', async () => {
    ddbMock
      .on(ScanCommand)
      .resolvesOnce({
        Items: [makeResource({ resource: 'https://b.example.com/', resource_name: 'Beta' })],
        LastEvaluatedKey: { resource: 'b' },
      })
      .resolvesOnce({
        Items: [makeResource({ resource: 'https://a.example.com/', resource_name: 'Alpha' })],
      });

    expect((await store.list()).map((r) => r.metadata.resource_name)).toEqual(['Alpha', 'Beta']);
  });

  it('creates only when the indicator is free, aliasing the reserved word', async () => {
    ddbMock.on(PutCommand).resolves({});

    await store.create(record);

    expect(ddbMock.commandCalls(PutCommand)[0]?.args[0].input).toMatchObject({
      Item: record,
      ConditionExpression: 'attribute_not_exists(#resource)',
      ExpressionAttributeNames: { '#resource': 'resource' },
    });
  });

  it('replaces only an existing resource', async () => {
    ddbMock.on(PutCommand).resolves({});

    await store.replace(record);

    expect(ddbMock.commandCalls(PutCommand)[0]?.args[0].input.ConditionExpression).toBe(
      'attribute_exists(#resource)',
    );
  });

  it('removes a resource by indicator', async () => {
    ddbMock.on(DeleteCommand).resolves({});

    await store.remove('https://api.example.com/');

    expect(ddbMock.commandCalls(DeleteCommand)[0]?.args[0].input.Key).toEqual({
      resource: 'https://api.example.com/',
    });
  });
});
