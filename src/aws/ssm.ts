import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({});

const CACHE_TTL_MS = 5 * 60 * 1000;

// Cached in module scope so a warm Lambda execution environment reuses
// parameters instead of re-fetching them from SSM on every invoke. Entries
// expire so a rotated or re-created secret is picked up without a cold start.
const cache = new Map<string, { value: string; fetchedAt: number }>();

/** Fetches SecureString parameters in a single SSM round trip, caching each value. */
export async function getParameters(names: readonly string[]): Promise<Map<string, string>> {
  const now = Date.now();
  const isFresh = (name: string) => now - (cache.get(name)?.fetchedAt ?? -Infinity) < CACHE_TTL_MS;
  const missing = names.filter((name) => !isFresh(name));
  if (missing.length > 0) {
    const result = await ssmClient.send(
      new GetParametersCommand({ Names: missing, WithDecryption: true }),
    );
    for (const parameter of result.Parameters ?? []) {
      if (parameter.Name && parameter.Value) {
        cache.set(parameter.Name, { value: parameter.Value, fetchedAt: now });
      }
    }
  }

  const unset = names.filter((name) => !isFresh(name));
  if (unset.length > 0) {
    throw new Error(`SSM parameters have no value yet: ${unset.join(', ')}`);
  }
  return new Map(names.map((name) => [name, (cache.get(name) as { value: string }).value]));
}

export async function getParameter(name: string): Promise<string> {
  return (await getParameters([name])).get(name) as string;
}
