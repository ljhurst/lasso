import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { createLiveApp } from '#src/live-app.ts';

const req = {} as IncomingMessage;
const res = {} as ServerResponse;

function setup(initial = 'v1') {
  let version = initial;
  let time = 0;
  const builds: string[] = [];
  const errors: unknown[] = [];
  const control = {
    setVersion: (next: string) => {
      version = next;
    },
    advance: (ms: number) => {
      time += ms;
    },
    failReads: false,
    failBuilds: false,
    reads: 0,
  };
  const create = () =>
    createLiveApp({
      build: async () => {
        if (control.failBuilds && builds.length > 0) {
          throw new Error('build failed');
        }
        builds.push(version);
        const built = version;
        return { version: built, handler: () => built };
      },
      readVersion: async () => {
        control.reads += 1;
        if (control.failReads) {
          throw new Error('read failed');
        }
        return version;
      },
      ttlMs: 1000,
      now: () => time,
      onError: (error) => errors.push(error),
    });
  return { control, builds, errors, create };
}

describe('createLiveApp', () => {
  it('builds once up front and serves with it', async () => {
    const { create, builds } = setup();

    const handle = await create();

    expect(builds).toEqual(['v1']);
    expect(await handle(req, res)).toBe('v1');
  });

  it('does not look for a change before the interval is up', async () => {
    const { create, control } = setup();
    const handle = await create();

    control.setVersion('v2');
    control.advance(999);

    expect(await handle(req, res)).toBe('v1');
    expect(control.reads).toBe(0);
  });

  it('rebuilds when the version has changed once the interval is up', async () => {
    const { create, control, builds } = setup();
    const handle = await create();

    control.setVersion('v2');
    control.advance(1000);

    expect(await handle(req, res)).toBe('v2');
    expect(builds).toEqual(['v1', 'v2']);
  });

  it('keeps the same app when nothing changed', async () => {
    const { create, control, builds } = setup();
    const handle = await create();

    control.advance(1000);
    await handle(req, res);
    control.advance(1000);
    await handle(req, res);

    expect(builds).toEqual(['v1']);
    expect(control.reads).toBe(2);
  });

  it('checks once for requests that arrive together', async () => {
    const { create, control } = setup();
    const handle = await create();
    control.setVersion('v2');
    control.advance(1000);

    const answers = await Promise.all([handle(req, res), handle(req, res), handle(req, res)]);

    expect(answers).toEqual(['v2', 'v2', 'v2']);
    expect(control.reads).toBe(1);
  });

  it('keeps serving the current app when the check fails, and tries again later', async () => {
    const { create, control, errors } = setup();
    const handle = await create();
    control.setVersion('v2');
    control.failReads = true;
    control.advance(1000);

    expect(await handle(req, res)).toBe('v1');
    expect(errors).toHaveLength(1);

    control.failReads = false;
    expect(await handle(req, res)).toBe('v1');
    control.advance(1000);
    expect(await handle(req, res)).toBe('v2');
  });

  it('keeps serving the current app when a rebuild fails', async () => {
    const { create, control, errors } = setup();
    const handle = await create();
    control.setVersion('v2');
    control.failBuilds = true;
    control.advance(1000);

    expect(await handle(req, res)).toBe('v1');
    expect(errors).toHaveLength(1);
  });

  it('works with the real clock too', async () => {
    vi.useFakeTimers();
    const handle = await createLiveApp({
      build: async () => ({ version: 'a', handler: () => 'a' }),
      readVersion: async () => 'a',
      ttlMs: 10,
    });

    vi.advanceTimersByTime(20);

    expect(await handle(req, res)).toBe('a');
    vi.useRealTimers();
  });
});
