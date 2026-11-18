import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient } from '#src/adapter/client.ts';
import { env } from '#src/env.ts';
import { normalizeEmail } from '#src/users/email.ts';
import { type TemporaryPassword, temporaryPasswordUpdate } from '#src/users/provision.ts';
import type { User } from '#src/users/types.ts';

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
      ExpressionAttributeValues: { ':email': normalizeEmail(email) },
      Limit: 1,
    }),
  );
  return result.Items?.[0] as User | undefined;
}

export async function listUsers(): Promise<User[]> {
  const result = await docClient.send(new ScanCommand({ TableName: env.usersTableName }));
  return (result.Items ?? []) as User[];
}

export async function createUser(user: User): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: env.usersTableName,
      Item: user,
      ConditionExpression: 'attribute_not_exists(#sub)',
      ExpressionAttributeNames: { '#sub': 'sub' },
    }),
  );
}

export async function deleteUser(sub: string): Promise<void> {
  await docClient.send(new DeleteCommand({ TableName: env.usersTableName, Key: { sub } }));
}

export async function addRole(sub: string, role: string): Promise<void> {
  const user = await getUserBySub(sub);
  if (!user) {
    throw new Error(`no user found for sub ${sub}`);
  }
  if (user.roles.includes(role)) {
    return;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: env.usersTableName,
      Key: { sub },
      UpdateExpression: 'SET #roles = :roles',
      ExpressionAttributeNames: { '#roles': 'roles' },
      ExpressionAttributeValues: { ':roles': [...user.roles, role] },
    }),
  );
}

export async function removeRole(sub: string, role: string): Promise<void> {
  const user = await getUserBySub(sub);
  if (!user) {
    throw new Error(`no user found for sub ${sub}`);
  }
  if (!user.roles.includes(role)) {
    return;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: env.usersTableName,
      Key: { sub },
      UpdateExpression: 'SET #roles = :roles',
      ExpressionAttributeNames: { '#roles': 'roles' },
      ExpressionAttributeValues: { ':roles': user.roles.filter((r) => r !== role) },
    }),
  );
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
        'SET passwordHash = :hash, passwordSalt = :salt, mustChangePassword = :false REMOVE tempPasswordExpiresAt, passwordResetAt',
      ExpressionAttributeValues: {
        ':hash': password.hash,
        ':salt': password.salt,
        ':false': false,
      },
    }),
  );
}

export async function setTemporaryPassword(sub: string, temp: TemporaryPassword): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: env.usersTableName,
      Key: { sub },
      ...temporaryPasswordUpdate(temp, new Date().toISOString()),
    }),
  );
}
