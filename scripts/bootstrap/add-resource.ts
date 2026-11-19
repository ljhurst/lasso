#!/usr/bin/env node
// Command-line resource registration, for when the admin portal can't be
// reached; the portal's Resources section covers everyday adds. It runs the
// same code as the portal. Run with an AWS profile that can write the
// resources table. --dry-run checks the resource against the table and prints
// what would be stored without writing it.
import { parseArgs } from 'node:util';

import { registerResource } from '../../src/resources/register.ts';
import { LASSO_ADMIN_SCOPE } from '../../src/resources/scopes.ts';
import { createResourceStore } from '../../src/resources/storage/store.ts';
import { AppType } from '../../src/resources/types.ts';
import { createDynamoClient } from './dynamo.ts';

const { values } = parseArgs({
  options: {
    resource: { type: 'string' },
    name: { type: 'string' },
    scope: { type: 'string', multiple: true, default: [] },
    'app-type': { type: 'string' },
    'app-url': { type: 'string', default: '' },
    table: { type: 'string', default: 'lj-lasso-resources' },
    issuer: { type: 'string', default: 'https://lasso.bylukehurst.com' },
    profile: { type: 'string', default: 'lasso-deploy' },
    region: { type: 'string', default: 'us-east-1' },
    'dry-run': { type: 'boolean', default: false },
  },
});

async function main(): Promise<void> {
  if (!values.resource || !values.name) {
    throw new Error('--resource and --name are required');
  }
  const appTypes: string[] = Object.values(AppType);
  if (values['app-type'] && !appTypes.includes(values['app-type'])) {
    throw new Error(`--app-type must be one of ${appTypes.join(', ')}`);
  }

  const store = createResourceStore(
    createDynamoClient(values.profile, values.region),
    values.table,
  );
  const services = {
    store: values['dry-run'] ? { ...store, create: async () => undefined } : store,
    reserved: { scopes: [LASSO_ADMIN_SCOPE], resources: [values.issuer] },
    scopesHeldByClients: async () => new Set<string>(),
  };

  const result = await registerResource(services, {
    resource: values.resource,
    name: values.name,
    scopes: values.scope,
    appType: values['app-type'] as AppType | undefined,
    appUrl: values['app-url'],
  });

  if ('error' in result) {
    throw new Error(result.error);
  }
  console.log(`${values['dry-run'] ? 'Would create' : 'Created'} ${result.record.resource}.`);
  if (values['dry-run']) {
    console.log(JSON.stringify(result.record, null, 2));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
