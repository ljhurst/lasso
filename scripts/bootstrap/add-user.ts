#!/usr/bin/env node
// Manual user provisioning (DESIGN §6): Lasso has no self-service signup,
// so accounts are created and reset by hand with this script, run with an
// AWS profile that can write the users table directly. A random temp
// password is generated and printed once — hand it to the person out of
// band. mustChangePassword forces them to set their own password on first
// login (src/interactions/routes.ts) before they reach consent.
import { randomBytes, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { hashPassword } from '../../src/users/password.ts';
import type { User } from '../../src/users/types.ts';
import { createDynamoClient } from './dynamo.ts';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    'given-name': { type: 'string' },
    'family-name': { type: 'string' },
    admin: { type: 'boolean', default: false },
    reset: { type: 'string' },
    table: { type: 'string', default: 'lj-lasso-users' },
    profile: { type: 'string', default: 'lasso-deploy' },
    region: { type: 'string', default: 'us-east-1' },
  },
});

function generateTempPassword(): string {
  return randomBytes(12).toString('base64url');
}

async function findByEmail(
  client: ReturnType<typeof createDynamoClient>,
  table: string,
  email: string,
): Promise<User | undefined> {
  const result = await client.send(
    new QueryCommand({
      TableName: table,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    }),
  );
  return result.Items?.[0] as User | undefined;
}

async function resetPassword(
  client: ReturnType<typeof createDynamoClient>,
  table: string,
  email: string,
): Promise<void> {
  const user = await findByEmail(client, table, email);
  if (!user) {
    throw new Error(`no user found with email ${email}`);
  }

  const tempPassword = generateTempPassword();
  const { hash, salt } = await hashPassword(tempPassword);

  await client.send(
    new UpdateCommand({
      TableName: table,
      Key: { sub: user.sub },
      UpdateExpression:
        'SET passwordHash = :hash, passwordSalt = :salt, mustChangePassword = :true',
      ExpressionAttributeValues: { ':hash': hash, ':salt': salt, ':true': true },
    }),
  );

  console.log(`Reset password for ${email}. Temporary password: ${tempPassword}`);
}

async function createUser(
  client: ReturnType<typeof createDynamoClient>,
  table: string,
): Promise<void> {
  if (!values.email || !values['given-name'] || !values['family-name']) {
    throw new Error('--email, --given-name, and --family-name are required to create a user');
  }

  if (await findByEmail(client, table, values.email)) {
    throw new Error(`a user with email ${values.email} already exists — use --reset instead`);
  }

  const tempPassword = generateTempPassword();
  const { hash, salt } = await hashPassword(tempPassword);

  const user: User = {
    sub: randomUUID(),
    email: values.email,
    emailVerified: true,
    givenName: values['given-name'],
    familyName: values['family-name'],
    passwordHash: hash,
    passwordSalt: salt,
    mustChangePassword: true,
    roles: values.admin ? ['admin'] : [],
    createdAt: new Date().toISOString(),
  };

  await client.send(new PutCommand({ TableName: table, Item: user }));

  console.log(`Created ${values.email} (sub ${user.sub}). Temporary password: ${tempPassword}`);
}

async function main(): Promise<void> {
  const client = createDynamoClient(values.profile, values.region);

  if (values.reset) {
    await resetPassword(client, values.table, values.reset);
    return;
  }

  await createUser(client, values.table);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
