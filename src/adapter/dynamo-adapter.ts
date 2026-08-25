import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Adapter, AdapterPayload } from 'oidc-provider';
import { env } from '../env.ts';
import { docClient } from './client.ts';
import { type LassoItem, primaryKey, toItem, uidIndexKey } from './keys.ts';

const BATCH_WRITE_LIMIT = 25;

export class DynamoAdapter implements Adapter {
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<void> {
    const item = toItem(this.name, id, payload, expiresIn);
    await docClient.send(new PutCommand({ TableName: env.oidcTableName, Item: item }));
  }

  async find(id: string): Promise<AdapterPayload | undefined> {
    const result = await docClient.send(
      new GetCommand({ TableName: env.oidcTableName, Key: { pk: primaryKey(this.name, id) } }),
    );
    return itemToPayload(result.Item as LassoItem | undefined);
  }

  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: env.oidcTableName,
        IndexName: 'user-code-index',
        KeyConditionExpression: 'userCode = :userCode',
        ExpressionAttributeValues: { ':userCode': userCode },
        Limit: 1,
      }),
    );
    return itemToPayload(result.Items?.[0] as LassoItem | undefined);
  }

  async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: env.oidcTableName,
        IndexName: 'uid-index',
        KeyConditionExpression: 'uid = :uid',
        ExpressionAttributeValues: { ':uid': uidIndexKey(this.name, uid) },
        Limit: 1,
      }),
    );
    return itemToPayload(result.Items?.[0] as LassoItem | undefined);
  }

  async consume(id: string): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: env.oidcTableName,
        Key: { pk: primaryKey(this.name, id) },
        UpdateExpression: 'SET #consumed = :true',
        ExpressionAttributeNames: { '#consumed': 'consumed' },
        ExpressionAttributeValues: { ':true': true },
      }),
    );
  }

  async destroy(id: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({ TableName: env.oidcTableName, Key: { pk: primaryKey(this.name, id) } }),
    );
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: env.oidcTableName,
        IndexName: 'grant-index',
        KeyConditionExpression: 'grantId = :grantId',
        ExpressionAttributeValues: { ':grantId': grantId },
      }),
    );
    const items = (result.Items ?? []) as LassoItem[];

    for (let i = 0; i < items.length; i += BATCH_WRITE_LIMIT) {
      const chunk = items.slice(i, i + BATCH_WRITE_LIMIT);
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [env.oidcTableName]: chunk.map((item) => ({
              DeleteRequest: { Key: { pk: item.pk } },
            })),
          },
        }),
      );
    }
  }
}

function itemToPayload(item: LassoItem | undefined): AdapterPayload | undefined {
  if (!item) {
    return undefined;
  }
  return { ...item.payload, ...(item.consumed ? { consumed: Math.floor(Date.now() / 1000) } : {}) };
}
