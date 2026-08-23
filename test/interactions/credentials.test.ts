import { randomBytes } from 'node:crypto';

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';

process.env.LASSO_DYNAMODB_TABLE_NAME ??= 'lj-lasso-test';
process.env.LASSO_JWKS_SSM_PARAM ??= '/lasso/jwks-test';
process.env.LASSO_CREDENTIAL_SSM_PARAM ??= '/lasso/login-credential-test';
process.env.LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM ??=
  '/lasso/porto-victoria-client-secret-test';
process.env.LASSO_ISSUER ??= 'https://lasso.example.com';

const { scryptHash, verifyCredentials } = await import('../../src/interactions/credentials.ts');

const ssmMock = mockClient(SSMClient);

beforeEach(async () => {
  ssmMock.reset();
  const salt = randomBytes(16);
  const hash = await scryptHash('correct-horse', salt);
  ssmMock.on(GetParameterCommand).resolves({
    Parameter: {
      Value: JSON.stringify({
        username: 'luke',
        salt: salt.toString('hex'),
        hash: hash.toString('hex'),
      }),
    },
  });
});

describe('verifyCredentials', () => {
  it('accepts the correct username and password', async () => {
    expect(await verifyCredentials('luke', 'correct-horse')).toBe(true);
  });

  it('rejects a wrong password', async () => {
    expect(await verifyCredentials('luke', 'wrong')).toBe(false);
  });

  it('rejects a wrong username', async () => {
    expect(await verifyCredentials('someone-else', 'correct-horse')).toBe(false);
  });
});
