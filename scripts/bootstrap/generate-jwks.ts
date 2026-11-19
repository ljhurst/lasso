#!/usr/bin/env node
// One-time bootstrap: generates a signing key for oidc-provider's JWKS
// (DESIGN §5) and writes it to SSM Parameter Store. Not run at request
// time — src/config/jwks.ts only ever reads what this script writes.
//
// RS256/2048-bit is the broadly-compatible baseline OIDC clients expect;
// the kid is an RFC 7638 JWK thumbprint so it's deterministic and
// collision-resistant, the standard approach rather than a random id.
import { parseArgs } from 'node:util';

import { calculateJwkThumbprint, exportJWK, generateKeyPair } from 'jose';

import { createSsmSecretStore } from '../../src/clients/secrets.ts';
import { assertCanWrite, createSsmClient } from './ssm.ts';

const { values } = parseArgs({
  options: {
    'param-name': { type: 'string', default: '/lasso/jwks' },
    profile: { type: 'string', default: 'lasso-deploy' },
    region: { type: 'string', default: 'us-east-1' },
    'dry-run': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
});

async function main(): Promise<void> {
  const client = createSsmClient(values.profile, values.region);

  await assertCanWrite(client, values['param-name'], {
    dryRun: values['dry-run'],
    force: values.force,
    consequence: 'this invalidates every token signed with the current key',
  });

  const { privateKey } = await generateKeyPair('RS256', { modulusLength: 2048, extractable: true });
  const jwk = await exportJWK(privateKey);
  const kid = await calculateJwkThumbprint(jwk);

  const jwks = { keys: [{ ...jwk, alg: 'RS256', use: 'sig', kid }] };

  if (values['dry-run']) {
    console.log(JSON.stringify(jwks, null, 2));
    return;
  }

  await createSsmSecretStore(client).put(values['param-name'], JSON.stringify(jwks));
  console.log(`Stored a new RS256 signing key (kid ${kid}) in ${values['param-name']}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
