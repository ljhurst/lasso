import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({});

const cache = new Map<string, string>();

export async function getClientSecret(ssmParam: string): Promise<string> {
  const cached = cache.get(ssmParam);
  if (cached) {
    return cached;
  }

  const result = await ssmClient.send(
    new GetParameterCommand({ Name: ssmParam, WithDecryption: true }),
  );
  if (!result.Parameter?.Value) {
    throw new Error(`parameter ${ssmParam} has no secret value yet`);
  }

  cache.set(ssmParam, result.Parameter.Value);
  return result.Parameter.Value;
}
