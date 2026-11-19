import { DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, type ScanCommandInput } from '@aws-sdk/lib-dynamodb';

export function createDocClient(config: DynamoDBClientConfig = {}): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(new DynamoDBClient(config), {
    marshallOptions: { removeUndefinedValues: true },
  });
}

export const docClient = createDocClient();

/** Every item a scan matches, following the key DynamoDB returns each time a page hits its size limit. */
export async function scanAll(
  db: DynamoDBDocumentClient,
  input: ScanCommandInput,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db.send(new ScanCommand({ ...input, ExclusiveStartKey: startKey }));
    items.push(...(page.Items ?? []));
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return items;
}
