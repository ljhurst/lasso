import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createClientStore } from '#src/clients/storage/store.ts';
import { makeClient } from '#test/support/clients.ts';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ddbMock = mockClient(db);
const store = createClientStore(db, 'clients-table');
const client = makeClient();

beforeEach(() => {
  ddbMock.reset();
});

describe('client store', () => {
  it('gets a client by id from its table', async () => {
    ddbMock.on(GetCommand).resolves({ Item: client });

    expect(await store.get('my-app')).toEqual(client);
    expect(ddbMock.commandCalls(GetCommand)[0]?.args[0].input).toMatchObject({
      TableName: 'clients-table',
      Key: { clientId: 'my-app' },
    });
  });

  it('returns undefined for an unknown client', async () => {
    ddbMock.on(GetCommand).resolves({});

    expect(await store.get('nope')).toBeUndefined();
  });

  it('lists clients sorted by name', async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        makeClient({ clientId: 'b', name: 'Beta' }),
        makeClient({ clientId: 'a', name: 'Alpha' }),
      ],
    });

    expect((await store.list()).map((c) => c.name)).toEqual(['Alpha', 'Beta']);
  });

  it('creates only when the id is free', async () => {
    ddbMock.on(PutCommand).resolves({});

    await store.create(client);

    expect(ddbMock.commandCalls(PutCommand)[0]?.args[0].input).toMatchObject({
      Item: client,
      ConditionExpression: 'attribute_not_exists(clientId)',
    });
  });

  it('replaces only an existing client', async () => {
    ddbMock.on(PutCommand).resolves({});

    await store.replace(client);

    expect(ddbMock.commandCalls(PutCommand)[0]?.args[0].input.ConditionExpression).toBe(
      'attribute_exists(clientId)',
    );
  });

  it('removes a client by id', async () => {
    ddbMock.on(DeleteCommand).resolves({});

    await store.remove('my-app');

    expect(ddbMock.commandCalls(DeleteCommand)[0]?.args[0].input.Key).toEqual({
      clientId: 'my-app',
    });
  });
});
