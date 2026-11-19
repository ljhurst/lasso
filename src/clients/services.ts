import { SSMClient } from '@aws-sdk/client-ssm';
import { docClient } from '#src/aws/dynamo.ts';
import type { ClientServices } from '#src/clients/register.ts';
import { createSsmSecretStore } from '#src/clients/secrets.ts';
import { createClientStore } from '#src/clients/storage/store.ts';
import { env } from '#src/env.ts';

export const clientServices: ClientServices = {
  store: createClientStore(docClient, env.clientsTableName),
  secrets: createSsmSecretStore(new SSMClient({})),
};
