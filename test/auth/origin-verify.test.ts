import { describe, expect, it } from 'vitest';
import { originGuard } from '#src/auth/origin-verify.ts';

function contextWith(headers: Record<string, string>) {
  return {
    state: {} as Record<string, unknown>,
    status: 404,
    get: (name: string) => headers[name.toLowerCase()] ?? '',
  };
}

async function run(secret: string, headers: Record<string, string>) {
  const ctx = contextWith(headers);
  let reached = false;
  await originGuard(secret)(ctx as never, async () => {
    reached = true;
  });
  return { ctx, reached };
}

describe('originGuard', () => {
  it('lets a request with the right secret through and records the viewer address', async () => {
    const { ctx, reached } = await run('s3cret', {
      'x-origin-verify': 's3cret',
      'x-viewer-ip': '203.0.113.7',
    });

    expect(reached).toBe(true);
    expect(ctx.state.viewerIp).toBe('203.0.113.7');
  });

  it.each([
    ['missing', {}],
    ['wrong', { 'x-origin-verify': 'guess' }],
    ['a prefix of the real one', { 'x-origin-verify': 's3cre' }],
    ['longer than the real one', { 'x-origin-verify': 's3cret-and-more' }],
    ['empty', { 'x-origin-verify': '' }],
  ])('refuses a request whose secret is %s', async (_name, headers) => {
    const { ctx, reached } = await run('s3cret', { ...headers, 'x-viewer-ip': '198.51.100.1' });

    expect(reached).toBe(false);
    expect(ctx.status).toBe(403);
    expect(ctx.state.viewerIp).toBeUndefined();
  });

  it('refuses to be built without a secret', () => {
    expect(() => originGuard('')).toThrow('origin verify secret is empty');
  });
});
