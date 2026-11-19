#!/usr/bin/env node
// Command-line user provisioning, for the first admin and for when the
// admin portal can't be reached; the portal's Users page covers everyday
// adds. Lasso has no self-service signup. Run with an AWS profile that can
// write the users table directly. A random temp password is generated and
// printed once — hand it to the person out of band. mustChangePassword
// forces them to set their own password on first login
// (src/interactions/routes.ts) before they reach consent.
import { parseArgs } from 'node:util';

import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { LASSO_ADMIN_SCOPE } from '../../src/config/scopes.ts';
import { normalizeEmail } from '../../src/users/email.ts';
import { buildNewUser, issueTemporaryPassword } from '../../src/users/provision.ts';
import { temporaryPasswordUpdate } from '../../src/users/storage/expressions.ts';
import type { User } from '../../src/users/types.ts';
import { createDynamoClient } from './dynamo.ts';

const { values: rawValues } = parseArgs({
  options: {
    email: { type: 'string' },
    'given-name': { type: 'string' },
    'family-name': { type: 'string' },
    admin: { type: 'boolean', default: false },
    reset: { type: 'string' },
    'grant-role': { type: 'string' },
    table: { type: 'string', default: 'lj-lasso-users' },
    profile: { type: 'string', default: 'lasso-deploy' },
    region: { type: 'string', default: 'us-east-1' },
  },
});

const values = {
  ...rawValues,
  email: rawValues.email && normalizeEmail(rawValues.email),
  reset: rawValues.reset && normalizeEmail(rawValues.reset),
};

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

  const temp = await issueTemporaryPassword();

  await client.send(
    new UpdateCommand({
      TableName: table,
      Key: { sub: user.sub },
      ...temporaryPasswordUpdate(temp, new Date().toISOString()),
    }),
  );

  console.log(
    `Reset password for ${email}. Temporary password: ${temp.tempPassword} (expires ${new Date(temp.expiresAt * 1000).toISOString()})`,
  );
}

async function grantRole(
  client: ReturnType<typeof createDynamoClient>,
  table: string,
  email: string,
  role: string,
): Promise<void> {
  const user = await findByEmail(client, table, email);
  if (!user) {
    throw new Error(`no user found with email ${email}`);
  }

  if (user.roles.includes(role)) {
    console.log(`${email} already has role ${role}.`);
    return;
  }

  await client.send(
    new UpdateCommand({
      TableName: table,
      Key: { sub: user.sub },
      UpdateExpression: 'SET #roles = :roles',
      ExpressionAttributeNames: { '#roles': 'roles' },
      ExpressionAttributeValues: { ':roles': [...user.roles, role] },
    }),
  );

  console.log(`Granted ${role} to ${email}.`);
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

  const { user, tempPassword } = await buildNewUser({
    email: values.email,
    givenName: values['given-name'],
    familyName: values['family-name'],
    roles: values.admin ? [LASSO_ADMIN_SCOPE] : [],
  });

  await client.send(new PutCommand({ TableName: table, Item: user }));

  console.log(`Created ${values.email} (sub ${user.sub}). Temporary password: ${tempPassword}`);
}

async function main(): Promise<void> {
  const client = createDynamoClient(values.profile, values.region);

  if (values.reset) {
    await resetPassword(client, values.table, values.reset);
    return;
  }

  if (values['grant-role']) {
    if (!values.email) {
      throw new Error('--email is required with --grant-role');
    }
    await grantRole(client, values.table, values.email, values['grant-role']);
    return;
  }

  await createUser(client, values.table);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
