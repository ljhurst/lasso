#!/usr/bin/env node
// One-time copy of the built-in clients into the clients table. Existing
// rows are left alone, so it is safe to re-run. The client secret stays in
// SSM; the row only names the parameter. Run with an AWS profile that can
// write the clients table.
import { parseArgs } from 'node:util';

import { createClientStore } from '../../src/clients/storage/store.ts';
import { seedClients } from '../../src/clients/seed.ts';
import { validateClient } from '../../src/clients/validate.ts';
import { createDynamoClient } from './dynamo.ts';

const { values } = parseArgs({
  options: {
    table: { type: 'string', default: 'lj-lasso-clients' },
    profile: { type: 'string', default: 'lasso-deploy' },
    region: { type: 'string', default: 'us-east-1' },
    'dry-run': { type: 'boolean', default: false },
  },
});

async function main(): Promise<void> {
  const store = createClientStore(createDynamoClient(values.profile, values.region), values.table);
  const createdAt = new Date().toISOString();

  for (const seed of seedClients) {
    const record = { ...seed, createdAt };
    const scopes = record.scope?.split(' ') ?? [];
    const problem = validateClient(record, scopes);
    if (problem) {
      throw new Error(`${record.clientId}: ${problem}`);
    }
    if (await store.get(record.clientId)) {
      console.log(`${record.clientId}: already in ${values.table}, skipped`);
      continue;
    }
    if (!values['dry-run']) {
      await store.create(record);
    }
    console.log(`${record.clientId}: ${values['dry-run'] ? 'would copy' : 'copied'}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
