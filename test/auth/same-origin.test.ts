import { describe, expect, it } from 'vitest';
import { requireSameOrigin } from '#src/auth/same-origin.ts';

const ISSUER_ORIGIN = 'https://lasso.example.com';

async function run(method: string, headers: Record<string, string>) {
  const ctx = {
    method,
    status: 404,
    body: undefined as unknown,
    type: '',
    get: (name: string) => headers[name.toLowerCase()] ?? '',
  };
  let reached = false;
  await requireSameOrigin(ctx as never, async () => {
    reached = true;
  });
  return { ctx, reached };
}

describe('requireSameOrigin', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('lets %s through without any headers', async (method) => {
    expect((await run(method, {})).reached).toBe(true);
  });

  it('lets a POST through when the browser says it came from the same origin', async () => {
    expect((await run('POST', { 'sec-fetch-site': 'same-origin' })).reached).toBe(true);
  });

  it.each(['same-site', 'cross-site', 'none'])(
    'refuses a POST whose Sec-Fetch-Site is %s',
    async (site) => {
      const { ctx, reached } = await run('POST', {
        'sec-fetch-site': site,
        origin: ISSUER_ORIGIN,
      });

      expect(reached).toBe(false);
      expect(ctx.status).toBe(403);
    },
  );

  it('falls back to Origin when Sec-Fetch-Site is absent', async () => {
    expect((await run('POST', { origin: ISSUER_ORIGIN })).reached).toBe(true);
  });

  it.each([
    ['a sibling subdomain', 'https://fife.example.com'],
    ['a lookalike host', 'https://lasso.example.com.evil.com'],
    ['another scheme', 'http://lasso.example.com'],
    ['null', 'null'],
  ])('refuses a POST whose Origin is %s', async (_name, origin) => {
    const { ctx, reached } = await run('POST', { origin });

    expect(reached).toBe(false);
    expect(ctx.status).toBe(403);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'refuses a %s that carries neither header',
    async (method) => {
      const { ctx, reached } = await run(method, {});

      expect(reached).toBe(false);
      expect(ctx.status).toBe(403);
    },
  );
});
