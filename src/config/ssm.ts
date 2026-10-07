import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({});

// Cached in module scope so a warm Lambda execution environment reuses
// parameters instead of re-fetching them from SSM on every invoke.
const cache = new Map<string, string>();

/** Fetches SecureString parameters in a single SSM round trip, caching each value. */
export async function getParameters(names: readonly string[]): Promise<Map<string, string>> {
  const missing = names.filter((name) => !cache.has(name));
  if (missing.length > 0) {
    const result = await ssmClient.send(
      new GetParametersCommand({ Names: missing, WithDecryption: true }),
    );
    for (const parameter of result.Parameters ?? []) {
      if (parameter.Name && parameter.Value) {
        cache.set(parameter.Name, parameter.Value);
      }
    }
  }

  const unset = names.filter((name) => !cache.has(name));
  if (unset.length > 0) {
    throw new Error(`SSM parameters have no value yet: ${unset.join(', ')}`);
  }
  return new Map(names.map((name) => [name, cache.get(name) as string]));
}

export async function getParameter(name: string): Promise<string> {
  return (await getParameters([name])).get(name) as string;
}
