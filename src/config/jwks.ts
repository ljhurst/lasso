import { getParameter } from '#src/config/ssm.ts';
import { env } from '#src/env.ts';

interface Jwks {
  keys: Record<string, unknown>[];
}

export async function getJwks(): Promise<Jwks> {
  return JSON.parse(await getParameter(env.jwksSsmParam)) as Jwks;
}
