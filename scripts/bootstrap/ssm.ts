import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export function createSsmClient(profile: string, region: string): SSMClient {
  process.env.AWS_PROFILE ??= profile;
  return new SSMClient({ region });
}

export async function getExistingValue(
  client: SSMClient,
  paramName: string,
): Promise<string | undefined> {
  const existing = await client
    .send(new GetParameterCommand({ Name: paramName, WithDecryption: true }))
    .catch(() => undefined);
  const value = existing?.Parameter?.Value;
  return value && value !== 'REPLACE_ME_MANUALLY' ? value : undefined;
}
