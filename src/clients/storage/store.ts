import {
  DeleteCommand,
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { ClientRecord } from '#src/clients/types.ts';

export interface ClientStore {
  get(clientId: string): Promise<ClientRecord | undefined>;
  list(): Promise<ClientRecord[]>;
  create(record: ClientRecord): Promise<void>;
  replace(record: ClientRecord): Promise<void>;
  remove(clientId: string): Promise<void>;
}

/** Stores clients in `tableName`; callers pass the table client so scripts and the app share this code. */
export function createClientStore(db: DynamoDBDocumentClient, tableName: string): ClientStore {
  return {
    async get(clientId) {
      const result = await db.send(new GetCommand({ TableName: tableName, Key: { clientId } }));
      return result.Item as ClientRecord | undefined;
    },

    async list() {
      const result = await db.send(new ScanCommand({ TableName: tableName }));
      return ((result.Items ?? []) as ClientRecord[]).toSorted((a, b) =>
        a.metadata.client_name.localeCompare(b.metadata.client_name),
      );
    },

    async create(record) {
      await db.send(
        new PutCommand({
          TableName: tableName,
          Item: record,
          ConditionExpression: 'attribute_not_exists(clientId)',
        }),
      );
    },

    async replace(record) {
      await db.send(
        new PutCommand({
          TableName: tableName,
          Item: record,
          ConditionExpression: 'attribute_exists(clientId)',
        }),
      );
    },

    async remove(clientId) {
      await db.send(new DeleteCommand({ TableName: tableName, Key: { clientId } }));
    },
  };
}
