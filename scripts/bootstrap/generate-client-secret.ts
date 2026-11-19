#!/usr/bin/env node
// One-time bootstrap: generates a random client_credentials secret for an
// M2M oidc-provider client (DESIGN §7) and writes it to SSM Parameter
// Store. src/config/clients.ts reads it at startup and hands it
// to oidc-provider verbatim for client_secret_basic comparison — unlike
// the login credential, this is not hashed.
import { parseArgs } from 'node:util';

import { randomToken } from '../../src/auth/random.ts';
import { secretParamFor } from '../../src/clients/secret-param.ts';
import { createSsmSecretStore } from '../../src/clients/secrets.ts';
import { assertCanWrite, createSsmClient } from './ssm.ts';

const { values } = parseArgs({
  options: {
    client: { type: 'string' },
    'param-name': { type: 'string' },
    profile: { type: 'string', default: 'lasso-deploy' },
    region: { type: 'string', default: 'us-east-1' },
    'dry-run': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
});

async function main(): Promise<void> {
  if (!values.client) {
    throw new Error('--client is required, e.g. --client porto-victoria');
  }
  const paramName = values['param-name'] ?? secretParamFor(values.client);
  const client = createSsmClient(values.profile, values.region);

  await assertCanWrite(client, paramName, { dryRun: values['dry-run'], force: values.force });

  const secret = randomToken();

  if (values['dry-run']) {
    console.log(secret);
    return;
  }

  await createSsmSecretStore(client).put(paramName, secret);
  console.log(`Stored a new client secret for "${values.client}" in ${paramName}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
