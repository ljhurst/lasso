#!/usr/bin/env node
// One-time bootstrap: generates the key that signs Lasso's cookies and writes
// it to SSM Parameter Store. Rotating it invalidates every signed cookie, so
// all users log in again.
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';

import { PutParameterCommand } from '@aws-sdk/client-ssm';

import { createSsmClient, getExistingValue } from './ssm.ts';

const { values } = parseArgs({
  options: {
    'param-name': { type: 'string', default: '/lasso/cookie-key' },
    profile: { type: 'string', default: 'lasso-deploy' },
    region: { type: 'string', default: 'us-east-1' },
    'dry-run': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
});

async function main(): Promise<void> {
  const paramName = values['param-name'] as string;
  const client = createSsmClient(values.profile as string, values.region as string);

  if (!values['dry-run'] && !values.force && (await getExistingValue(client, paramName))) {
    throw new Error(`${paramName} already holds a real value — pass --force to overwrite.`);
  }

  const key = randomBytes(32).toString('base64url');

  if (values['dry-run']) {
    console.log(key);
    return;
  }

  await client.send(
    new PutParameterCommand({
      Name: paramName,
      Value: key,
      Type: 'SecureString',
      Overwrite: true,
    }),
  );
  console.log(`Stored a new cookie signing key in ${paramName}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
