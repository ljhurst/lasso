import type { AdapterPayload } from 'oidc-provider';
import { clientServices } from '#src/clients/services.ts';
import { secretParamFor } from '#src/clients/secret-param.ts';
import { clientTypeOf } from '#src/clients/types.ts';
import { getParameter } from '#src/config/ssm.ts';

export const CLIENT_MODEL = 'Client';

/** Looks a client up for oidc-provider, adding its secret from SSM when it is confidential. */
export async function findRegisteredClient(clientId: string): Promise<AdapterPayload | undefined> {
  const record = await clientServices.store.get(clientId);
  if (!record) {
    return undefined;
  }
  const secret =
    clientTypeOf(record.metadata) === 'confidential'
      ? await getParameter(secretParamFor(record.clientId))
      : undefined;
  return {
    ...record.metadata,
    client_id: record.clientId,
    ...(secret && { client_secret: secret }),
  } as AdapterPayload;
}
