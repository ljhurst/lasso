import type { AdapterPayload } from 'oidc-provider';
import { toClientMetadata } from '#src/clients/metadata.ts';
import { clientServices } from '#src/clients/services.ts';
import { getParameter } from '#src/config/ssm.ts';

export const CLIENT_MODEL = 'Client';

/** Looks a client up for oidc-provider, resolving its secret from SSM when it has one. */
export async function findRegisteredClient(clientId: string): Promise<AdapterPayload | undefined> {
  const record = await clientServices.store.get(clientId);
  if (!record) {
    return undefined;
  }
  const secret = record.secretSsmParam ? await getParameter(record.secretSsmParam) : undefined;
  return toClientMetadata(record, secret) as AdapterPayload;
}
