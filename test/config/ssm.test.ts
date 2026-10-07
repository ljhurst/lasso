import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ssmMock = mockClient(SSMClient);

async function loadSsm() {
  vi.resetModules();
  return import('#src/config/ssm.ts');
}

describe('getParameters', () => {
  beforeEach(() => {
    ssmMock.reset();
  });

  it('fetches every requested name in a single call with decryption', async () => {
    ssmMock.on(GetParametersCommand).resolves({
      Parameters: [
        { Name: '/a', Value: 'one' },
        { Name: '/b', Value: 'two' },
      ],
    });
    const { getParameters } = await loadSsm();

    const values = await getParameters(['/a', '/b']);

    expect(Object.fromEntries(values)).toEqual({ '/a': 'one', '/b': 'two' });
    const calls = ssmMock.commandCalls(GetParametersCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.args[0].input).toEqual({ Names: ['/a', '/b'], WithDecryption: true });
  });

  it('serves later lookups from cache without calling SSM again', async () => {
    ssmMock.on(GetParametersCommand).resolves({ Parameters: [{ Name: '/a', Value: 'one' }] });
    const { getParameters, getParameter } = await loadSsm();

    await getParameters(['/a']);
    expect(await getParameter('/a')).toBe('one');

    expect(ssmMock.commandCalls(GetParametersCommand)).toHaveLength(1);
  });

  it('only requests names that are not cached yet', async () => {
    ssmMock
      .on(GetParametersCommand, { Names: ['/a'] })
      .resolves({ Parameters: [{ Name: '/a', Value: 'one' }] })
      .on(GetParametersCommand, { Names: ['/b'] })
      .resolves({ Parameters: [{ Name: '/b', Value: 'two' }] });
    const { getParameters } = await loadSsm();

    await getParameters(['/a']);
    await getParameters(['/a', '/b']);

    const requested = ssmMock.commandCalls(GetParametersCommand).map((c) => c.args[0].input.Names);
    expect(requested).toEqual([['/a'], ['/b']]);
  });

  it('throws naming every parameter SSM returned no value for', async () => {
    ssmMock.on(GetParametersCommand).resolves({
      Parameters: [{ Name: '/a', Value: 'one' }],
      InvalidParameters: ['/b', '/c'],
    });
    const { getParameters } = await loadSsm();

    await expect(getParameters(['/a', '/b', '/c'])).rejects.toThrow(
      'SSM parameters have no value yet: /b, /c',
    );
  });
});
