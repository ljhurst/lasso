import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export function createSsmClient(profile: string, region: string): SSMClient {
  process.env.AWS_PROFILE ??= profile;
  return new SSMClient({ region });
}

/** Stops a bootstrap script before it replaces a real value, unless it was asked to (or only to print). */
export async function assertCanWrite(
  client: SSMClient,
  name: string,
  options: { dryRun: boolean; force: boolean; consequence?: string },
): Promise<void> {
  if (options.dryRun || options.force) {
    return;
  }
  if (await getExistingValue(client, name)) {
    const note = options.consequence ? ` (${options.consequence})` : '';
    throw new Error(`${name} already holds a real value — pass --force to overwrite${note}.`);
  }
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
