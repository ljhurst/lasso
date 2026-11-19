#!/usr/bin/env node
// One-off: rewrites client rows from the first stored shape (flat camelCase
// fields) to client metadata named as in the OAuth/OIDC registration specs.
// Rows already in the new shape are skipped, so it is safe to re-run. Run it
// before the release that reads the new shape. Run with an AWS profile that
// can read and write the clients table.
import { parseArgs } from 'node:util';

import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { migrateClientRow } from '../../src/clients/migrate-row.ts';
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
  const db = createDynamoClient(values.profile, values.region);
  const rows = (await db.send(new ScanCommand({ TableName: values.table }))).Items ?? [];

  for (const row of rows) {
    const migrated = migrateClientRow(row);
    if (!migrated) {
      console.log(`${row.clientId}: already migrated, skipped`);
      continue;
    }
    if (!values['dry-run']) {
      await db.send(new PutCommand({ TableName: values.table, Item: migrated }));
    }
    console.log(`${row.clientId}: ${values['dry-run'] ? 'would migrate' : 'migrated'}`);
    if (values['dry-run']) {
      console.log(JSON.stringify(migrated.metadata));
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
