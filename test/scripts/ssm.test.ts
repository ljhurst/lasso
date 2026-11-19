import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { assertCanWrite } from '../../scripts/bootstrap/ssm.ts';

const ssm = new SSMClient({});
const ssmMock = mockClient(ssm);

beforeEach(() => {
  ssmMock.reset();
});

describe('assertCanWrite', () => {
  it('refuses to replace a real value and says how to override', async () => {
    ssmMock.on(GetParameterCommand).resolves({ Parameter: { Value: 'live-secret' } });

    await expect(assertCanWrite(ssm, '/lasso/x', { dryRun: false, force: false })).rejects.toThrow(
      '/lasso/x already holds a real value — pass --force to overwrite.',
    );
  });

  it('adds what overwriting would cost when given', async () => {
    ssmMock.on(GetParameterCommand).resolves({ Parameter: { Value: 'live-secret' } });

    await expect(
      assertCanWrite(ssm, '/lasso/x', { dryRun: false, force: false, consequence: 'it breaks y' }),
    ).rejects.toThrow('pass --force to overwrite (it breaks y).');
  });

  it('does not say what the value is', async () => {
    ssmMock.on(GetParameterCommand).resolves({ Parameter: { Value: 'live-secret' } });

    const error = await assertCanWrite(ssm, '/lasso/x', { dryRun: false, force: false }).catch(
      (e: Error) => e,
    );

    expect(String(error)).not.toContain('live-secret');
  });

  it.each([
    ['a dry run', { dryRun: true, force: false }],
    ['--force', { dryRun: false, force: true }],
  ])('lets %s through without reading the parameter', async (_name, options) => {
    await expect(assertCanWrite(ssm, '/lasso/x', options)).resolves.toBeUndefined();
    expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(0);
  });

  it('lets a first write through: nothing stored, or only the placeholder', async () => {
    ssmMock.on(GetParameterCommand).rejects(new Error('ParameterNotFound'));
    await expect(
      assertCanWrite(ssm, '/lasso/x', { dryRun: false, force: false }),
    ).resolves.toBeUndefined();

    ssmMock.reset();
    ssmMock.on(GetParameterCommand).resolves({ Parameter: { Value: 'REPLACE_ME_MANUALLY' } });
    await expect(
      assertCanWrite(ssm, '/lasso/x', { dryRun: false, force: false }),
    ).resolves.toBeUndefined();
  });
});
