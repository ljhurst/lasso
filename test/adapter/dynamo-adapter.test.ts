import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';

process.env.TABLE_NAME ??= 'lj-lasso-test';
process.env.JWKS_SSM_PARAM ??= '/lasso/jwks-test';
process.env.CREDENTIAL_SSM_PARAM ??= '/lasso/login-credential-test';
process.env.ISSUER ??= 'https://lasso.example.com';

const { DynamoAdapter } = await import('../../src/adapter/dynamo-adapter.ts');

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('DynamoAdapter', () => {
  it('upserts a model-scoped item', async () => {
    ddbMock.on(PutCommand).resolves({});
    const adapter = new DynamoAdapter('AccessToken');

    await adapter.upsert('token-1', { grantId: 'grant-1' }, 3600);

    const [call] = ddbMock.commandCalls(PutCommand);
    expect(call?.args[0].input.Item).toMatchObject({
      pk: 'AccessToken#token-1',
      modelName: 'AccessToken',
      payload: { grantId: 'grant-1' },
      grantId: 'grant-1',
    });
  });

  it('finds an item by its model-scoped primary key', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { pk: 'Client#client-1', modelName: 'Client', id: 'client-1', payload: { foo: 'bar' } },
    });
    const adapter = new DynamoAdapter('Client');

    const result = await adapter.find('client-1');

    expect(result).toEqual({ foo: 'bar' });
    const [call] = ddbMock.commandCalls(GetCommand);
    expect(call?.args[0].input.Key).toEqual({ pk: 'Client#client-1' });
  });

  it('returns undefined when the item does not exist', async () => {
    ddbMock.on(GetCommand).resolves({});
    const adapter = new DynamoAdapter('Client');

    expect(await adapter.find('missing')).toBeUndefined();
  });
});
