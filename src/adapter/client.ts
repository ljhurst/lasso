import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Built once at module load so Lambda execution-environment reuse avoids
// re-establishing a client (and its connection pool) on every warm invoke.
const dynamoClient = new DynamoDBClient({});

export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});
