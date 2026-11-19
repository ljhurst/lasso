import {
  DeleteCommand,
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { scanAll } from '#src/aws/dynamo.ts';
import type { ResourceRecord } from '#src/resources/types.ts';

export interface ResourceStore {
  get(resource: string): Promise<ResourceRecord | undefined>;
  list(): Promise<ResourceRecord[]>;
  create(record: ResourceRecord): Promise<void>;
  replace(record: ResourceRecord): Promise<void>;
  remove(resource: string): Promise<void>;
}

/** Stores resources in `tableName`; callers pass the table client so scripts and the app share this code. */
export function createResourceStore(db: DynamoDBDocumentClient, tableName: string): ResourceStore {
  return {
    async get(resource) {
      const result = await db.send(new GetCommand({ TableName: tableName, Key: { resource } }));
      return result.Item as ResourceRecord | undefined;
    },

    async list() {
      const items = await scanAll(db, { TableName: tableName });
      return (items as unknown as ResourceRecord[]).toSorted((a, b) =>
        a.metadata.resource_name.localeCompare(b.metadata.resource_name),
      );
    },

    async create(record) {
      await db.send(
        new PutCommand({
          TableName: tableName,
          Item: record,
          ConditionExpression: 'attribute_not_exists(#resource)',
          ExpressionAttributeNames: { '#resource': 'resource' },
        }),
      );
    },

    async replace(record) {
      await db.send(
        new PutCommand({
          TableName: tableName,
          Item: record,
          ConditionExpression: 'attribute_exists(#resource)',
          ExpressionAttributeNames: { '#resource': 'resource' },
        }),
      );
    },

    async remove(resource) {
      await db.send(new DeleteCommand({ TableName: tableName, Key: { resource } }));
    },
  };
}
