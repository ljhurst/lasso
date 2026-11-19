import { DeleteParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSsmSecretStore } from '#src/clients/secrets.ts';

const ssm = new SSMClient({});
const ssmMock = mockClient(ssm);
const secrets = createSsmSecretStore(ssm);

beforeEach(() => {
  ssmMock.reset();
});

describe('secret store', () => {
  it('writes a SecureString, replacing any earlier value', async () => {
    ssmMock.on(PutParameterCommand).resolves({});

    await secrets.put('/lasso/client/x-secret', 'value');

    expect(ssmMock.commandCalls(PutParameterCommand)[0]?.args[0].input).toEqual({
      Name: '/lasso/client/x-secret',
      Value: 'value',
      Type: 'SecureString',
      Overwrite: true,
    });
  });

  it('deletes a parameter and tolerates one that is already gone', async () => {
    ssmMock
      .on(DeleteParameterCommand)
      .rejects(Object.assign(new Error('gone'), { name: 'ParameterNotFound' }));

    await expect(secrets.remove('/lasso/client/x-secret')).resolves.toBeUndefined();
  });

  it('surfaces any other delete failure', async () => {
    ssmMock
      .on(DeleteParameterCommand)
      .rejects(Object.assign(new Error('denied'), { name: 'AccessDeniedException' }));

    await expect(secrets.remove('/lasso/client/x-secret')).rejects.toThrow('denied');
  });
});
