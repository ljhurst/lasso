import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { createDocClient } from '../../src/aws/dynamo.ts';

export function createDynamoClient(profile: string, region: string): DynamoDBDocumentClient {
  process.env.AWS_PROFILE ??= profile;
  return createDocClient({ region });
}
