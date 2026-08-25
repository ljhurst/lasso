import { GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../adapter/client.ts';
import { env } from '../env.ts';
import type { User } from './types.ts';

export async function getUserBySub(sub: string): Promise<User | undefined> {
  const result = await docClient.send(
    new GetCommand({ TableName: env.usersTableName, Key: { sub } }),
  );
  return result.Item as User | undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: env.usersTableName,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    }),
  );
  return result.Items?.[0] as User | undefined;
}

export async function updatePassword(
  sub: string,
  password: { hash: string; salt: string },
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: env.usersTableName,
      Key: { sub },
      UpdateExpression:
        'SET passwordHash = :hash, passwordSalt = :salt, mustChangePassword = :false',
      ExpressionAttributeValues: {
        ':hash': password.hash,
        ':salt': password.salt,
        ':false': false,
      },
    }),
  );
}
