import { DeleteParameterCommand, PutParameterCommand, type SSMClient } from '@aws-sdk/client-ssm';

export interface SecretStore {
  put(name: string, value: string): Promise<void>;
  remove(name: string): Promise<void>;
}

/** Keeps client secrets as SecureString parameters, so Terraform never reads their values into state. */
export function createSsmSecretStore(ssm: SSMClient): SecretStore {
  return {
    async put(name, value) {
      await ssm.send(
        new PutParameterCommand({
          Name: name,
          Value: value,
          Type: 'SecureString',
          Overwrite: true,
        }),
      );
    },

    async remove(name) {
      await ssm.send(new DeleteParameterCommand({ Name: name })).catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'ParameterNotFound') {
          throw error;
        }
      });
    },
  };
}
