#!/usr/bin/env node
// One-time bootstrap: generates a random client_credentials secret for an
// M2M oidc-provider client (DESIGN §7) and writes it to SSM Parameter
// Store. src/config/clients.ts reads it via getClientSecret and hands it
// to oidc-provider verbatim for client_secret_basic comparison — unlike
// the login credential, this is not hashed.
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';

import { PutParameterCommand } from '@aws-sdk/client-ssm';

import { createSsmClient, getExistingValue } from './ssm.ts';

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
  const paramName = values['param-name'] ?? `/lasso/client/${values.client}-secret`;
  const client = createSsmClient(values.profile, values.region);

  if (!values['dry-run'] && !values.force && (await getExistingValue(client, paramName))) {
    throw new Error(`${paramName} already holds a real value — pass --force to overwrite.`);
  }

  const secret = randomBytes(32).toString('base64url');

  if (values['dry-run']) {
    console.log(secret);
    return;
  }

  await client.send(
    new PutParameterCommand({
      Name: paramName,
      Value: secret,
      Type: 'SecureString',
      Overwrite: true,
    }),
  );
  console.log(`Stored a new client secret for "${values.client}" in ${paramName}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
