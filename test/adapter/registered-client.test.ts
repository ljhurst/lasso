import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamoAdapter } from '#src/adapter/dynamo-adapter.ts';
import { makeClient, makeMachineClient } from '#test/support/clients.ts';

const getParameter = vi.hoisted(() => vi.fn());
vi.mock('#src/config/ssm.ts', () => ({ getParameter }));

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
  getParameter.mockReset();
});

describe('DynamoAdapter for the Client model', () => {
  it('serves a stored client from the clients table', async () => {
    ddbMock.on(GetCommand).resolves({ Item: makeClient() });

    const payload = await new DynamoAdapter('Client').find('my-app');

    expect(payload).toMatchObject({ client_id: 'my-app', redirect_uris: [expect.any(String)] });
    expect(ddbMock.commandCalls(GetCommand)[0]?.args[0].input).toMatchObject({
      TableName: 'lj-lasso-clients-test',
      Key: { clientId: 'my-app' },
    });
    expect(getParameter).not.toHaveBeenCalled();
  });

  it('adds the secret from SSM for a confidential client', async () => {
    ddbMock.on(GetCommand).resolves({ Item: makeMachineClient() });
    getParameter.mockResolvedValue('s3cret');

    const payload = await new DynamoAdapter('Client').find('my-service');

    expect(getParameter).toHaveBeenCalledWith('/lasso/client/my-service-secret');
    expect(payload).toMatchObject({ client_secret: 's3cret' });
  });

  it('returns undefined for an unknown client', async () => {
    ddbMock.on(GetCommand).resolves({});

    expect(await new DynamoAdapter('Client').find('nope')).toBeUndefined();
  });
});
