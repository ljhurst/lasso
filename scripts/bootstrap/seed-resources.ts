#!/usr/bin/env node
// One-time copy of the built-in resources into the resources table. Existing
// rows are left alone, so it is safe to re-run. Run with an AWS profile that
// can write the resources table.
import { parseArgs } from 'node:util';

import { createResourceStore } from '../../src/resources/storage/store.ts';
import { seedResources } from '../../src/resources/seed.ts';
import { validateResource } from '../../src/resources/validate.ts';
import { LASSO_ADMIN_SCOPE } from '../../src/resources/scopes.ts';
import { createDynamoClient } from './dynamo.ts';

const { values } = parseArgs({
  options: {
    table: { type: 'string', default: 'lj-lasso-resources' },
    issuer: { type: 'string', default: 'https://lasso.bylukehurst.com' },
    profile: { type: 'string', default: 'lasso-deploy' },
    region: { type: 'string', default: 'us-east-1' },
    'dry-run': { type: 'boolean', default: false },
  },
});

async function main(): Promise<void> {
  const store = createResourceStore(
    createDynamoClient(values.profile, values.region),
    values.table,
  );
  const createdAt = new Date().toISOString();

  for (const seed of seedResources) {
    const record = { ...seed, createdAt };
    const problem = validateResource(record.metadata, record.app, {
      scopes: [LASSO_ADMIN_SCOPE],
      resources: [values.issuer],
    });
    if (problem) {
      throw new Error(`${record.resource}: ${problem}`);
    }
    if (await store.get(record.resource)) {
      console.log(`${record.metadata.resource_name}: already in ${values.table}, skipped`);
      continue;
    }
    if (!values['dry-run']) {
      await store.create(record);
    }
    console.log(`${record.metadata.resource_name}: ${values['dry-run'] ? 'would copy' : 'copied'}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
