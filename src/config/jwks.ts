import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

import { env } from '../env.ts';

interface Jwks {
  keys: Record<string, unknown>[];
}

const ssmClient = new SSMClient({});

// Cached in module scope so a warm Lambda execution environment reuses the
// keyset instead of re-fetching it from SSM on every invoke.
let cachedJwks: Jwks | undefined;

export async function getJwks(): Promise<Jwks> {
  if (cachedJwks) {
    return cachedJwks;
  }

  const result = await ssmClient.send(
    new GetParameterCommand({ Name: env.jwksSsmParam, WithDecryption: true }),
  );
  if (!result.Parameter?.Value) {
    // TODO: keypair generation is a one-time deploy-time step (DESIGN §5,
    // §8), not runtime logic — this only ever reads what's already there.
    throw new Error(`parameter ${env.jwksSsmParam} has no JWKS value yet`);
  }

  cachedJwks = JSON.parse(result.Parameter.Value) as Jwks;
  return cachedJwks;
}
