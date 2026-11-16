import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestLog } from '#src/observability/request-log.ts';

function contextWith(path: string, status = 200) {
  return {
    method: 'GET',
    path,
    status,
    state: { viewerIp: '203.0.113.7' },
    get: () => '',
  };
}

function logged(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.map(([line]) => JSON.parse(line as string));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requestLog', () => {
  it('logs method, path, status, duration and viewer address', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await requestLog()(contextWith('/token', 200) as never, async () => {});

    expect(logged(spy)).toEqual([
      {
        event: 'request',
        method: 'GET',
        path: '/token',
        status: 200,
        ms: expect.any(Number),
        ip: '203.0.113.7',
      },
    ]);
  });

  it.each(['/interaction/AbC123xyz/login', '/auth/AbC123xyz', '/device/AbC123xyz'])(
    'logs %s without the uid',
    async (path) => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await requestLog()(contextWith(path) as never, async () => {});

      expect(logged(spy)[0].path).toBe(path.replace('AbC123xyz', ':uid'));
    },
  );

  it.each(['/auth', '/device/auth', '/token'])('leaves %s readable', async (path) => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await requestLog()(contextWith(path) as never, async () => {});

    expect(logged(spy)[0].path).toBe(path);
  });

  it('logs the client when the provider identified one', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = { ...contextWith('/token'), oidc: { client: { clientId: 'freal' } } };

    await requestLog()(ctx as never, async () => {});

    expect(logged(spy)[0].clientId).toBe('freal');
  });

  it('logs the status and message of a thrown error that carries a status', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const tooLarge = Object.assign(new Error('Payload Too Large'), { status: 413 });

    await expect(
      requestLog()(contextWith('/interaction/u/login', 404) as never, async () => {
        throw tooLarge;
      }),
    ).rejects.toBe(tooLarge);

    expect(logged(spy)[0]).toMatchObject({ status: 413, error: 'Payload Too Large' });
  });

  it('logs a 500 and rethrows when a handler throws', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const boom = new Error('boom');

    await expect(
      requestLog()(contextWith('/me', 404) as never, async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);

    expect(logged(spy)[0]).toMatchObject({ path: '/me', status: 500, error: 'boom' });
  });
});
