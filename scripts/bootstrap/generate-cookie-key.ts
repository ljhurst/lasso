#!/usr/bin/env node
// One-time bootstrap: generates the key that signs Lasso's cookies and writes
// it to SSM Parameter Store. Rotating it invalidates every signed cookie, so
// all users log in again.
import { parseArgs } from 'node:util';

import { randomToken } from '../../src/auth/random.ts';
import { createSsmSecretStore } from '../../src/clients/secrets.ts';
import { assertCanWrite, createSsmClient } from './ssm.ts';

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

  await assertCanWrite(client, paramName, { dryRun: values['dry-run'], force: values.force });

  const key = randomToken();

  if (values['dry-run']) {
    console.log(key);
    return;
  }

  await createSsmSecretStore(client).put(paramName, key);
  console.log(`Stored a new cookie signing key in ${paramName}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
