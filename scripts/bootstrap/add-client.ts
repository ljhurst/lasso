#!/usr/bin/env node
// Command-line client registration, for when the admin portal can't be
// reached; the portal's Clients page covers everyday adds. It runs the same
// code as the portal. A confidential client's secret is generated, written to SSM
// and printed once. Scopes are not checked against Lasso's registered
// resources here, so pass only scopes a resource defines. Run with an AWS
// profile that can write the clients table and the /lasso/client/ parameters.
import { parseArgs } from 'node:util';

import { SSMClient } from '@aws-sdk/client-ssm';

import { registerClient } from '../../src/clients/register.ts';
import { createSsmSecretStore } from '../../src/clients/secrets.ts';
import { createClientStore } from '../../src/clients/storage/store.ts';
import { createDynamoClient } from './dynamo.ts';

const { values } = parseArgs({
  options: {
    id: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string', default: 'public' },
    'redirect-uri': { type: 'string', multiple: true, default: [] },
    'post-logout-uri': { type: 'string', multiple: true, default: [] },
    scope: { type: 'string', multiple: true, default: [] },
    native: { type: 'boolean', default: false },
    table: { type: 'string', default: 'lj-lasso-clients' },
    profile: { type: 'string', default: 'lasso-deploy' },
    region: { type: 'string', default: 'us-east-1' },
  },
});

async function main(): Promise<void> {
  if (!values.id || !values.name) {
    throw new Error('--id and --name are required');
  }
  if (values.type !== 'public' && values.type !== 'confidential') {
    throw new Error('--type must be "public" or "confidential"');
  }

  process.env.AWS_PROFILE ??= values.profile;
  const services = {
    store: createClientStore(createDynamoClient(values.profile, values.region), values.table),
    secrets: createSsmSecretStore(new SSMClient({ region: values.region })),
  };

  const result = await registerClient(
    services,
    {
      clientId: values.id,
      name: values.name,
      clientType: values.type,
      applicationType: values.native ? 'native' : 'web',
      redirectUris: values['redirect-uri'],
      postLogoutRedirectUris: values['post-logout-uri'],
      scopes: values.scope,
    },
    values.scope,
  );

  if ('error' in result) {
    throw new Error(result.error);
  }
  console.log(`Created ${result.client.clientId}.`);
  if (result.secret) {
    console.log(`Client secret (shown once): ${result.secret}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
