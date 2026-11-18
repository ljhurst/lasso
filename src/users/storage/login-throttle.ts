import { DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '#src/adapter/client.ts';
import { env } from '#src/env.ts';

export const MAX_FAILED_LOGINS = 5;

const WINDOW_SECONDS = 15 * 60;
const CLEANUP_GRACE_SECONDS = 24 * 60 * 60;

/** Counts a login attempt before the password is checked; false means the pair is locked. */
export async function reserveLoginAttempt(sub: string, ip: string): Promise<boolean> {
  const window = currentWindow();
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: env.throttleTableName,
        Key: { pk: throttleKey(sub, ip, window) },
        UpdateExpression: 'ADD attempts :one SET expiresAt = :expiresAt',
        ConditionExpression: 'attribute_not_exists(attempts) OR attempts < :max',
        ExpressionAttributeValues: {
          ':one': 1,
          ':max': MAX_FAILED_LOGINS,
          ':expiresAt': (window + 1) * WINDOW_SECONDS + CLEANUP_GRACE_SECONDS,
        },
      }),
    );
    return true;
  } catch (error) {
    if ((error as { name?: string }).name === 'ConditionalCheckFailedException') {
      return false;
    }
    throw error;
  }
}

export async function clearLoginAttempts(sub: string, ip: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: env.throttleTableName,
      Key: { pk: throttleKey(sub, ip, currentWindow()) },
    }),
  );
}

function currentWindow(): number {
  return Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
}

function throttleKey(sub: string, ip: string, window: number): string {
  return `${sub}:${ip}:${window}`;
}
