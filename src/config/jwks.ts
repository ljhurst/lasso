import { getParameter } from '#src/aws/ssm.ts';
import { env } from '#src/env.ts';

interface Jwks {
  keys: Record<string, unknown>[];
}

export async function getJwks(): Promise<Jwks> {
  return JSON.parse(await getParameter(env.jwksSsmParam)) as Jwks;
}
