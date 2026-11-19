import Koa from 'koa';
import Router from '@koa/router';
import type Provider from 'oidc-provider';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildAdminRouter } from '#src/portal/admin/routes.ts';
import { serve, type TestServer } from '#test/support/http.ts';

vi.mock('#src/portal/auth/session.ts', () => ({
  buildRequirePortalSession: () => async (ctx: Koa.Context) => {
    ctx.status = 401;
  },
  requireAdmin: async (_ctx: Koa.Context, next: Koa.Next) => next(),
}));

let server: TestServer;

beforeAll(async () => {
  const app = new Koa();
  app.use(buildAdminRouter({} as Provider).routes());
  server = await serve(app.callback());
});

afterAll(() => {
  server.close();
});

/** Every route the router serves, as the method and a path with placeholders filled in. */
function routesOf(router: Router): { method: 'GET' | 'POST'; path: string }[] {
  return router.stack
    .filter((layer) => layer.methods.length > 0)
    .map((layer) => ({
      method: layer.methods.includes('GET') ? ('GET' as const) : ('POST' as const),
      path: String(layer.path).replace(/:\w+/g, 'x'),
    }));
}

/** The routes that answered a visitor with no session instead of refusing them. */
async function unguarded(router: Router, baseUrl: string): Promise<string[]> {
  const leaks: string[] = [];
  for (const { method, path } of routesOf(router)) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      redirect: 'manual',
      headers: {
        'sec-fetch-site': 'same-origin',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: method === 'POST' ? '' : undefined,
    });
    if (response.status !== 401) {
      leaks.push(`${method} ${path} -> ${response.status}`);
    }
  }
  return leaks;
}

describe('the admin gate', () => {
  it('sits in front of every admin route', async () => {
    const router = buildAdminRouter({} as Provider);

    expect(routesOf(router).length).toBeGreaterThan(10);
    expect(await unguarded(router, server.baseUrl)).toEqual([]);
  });

  it('would notice a route registered before the gate', async () => {
    const { buildRequirePortalSession } = await import('#src/portal/auth/session.ts');
    const router = new Router({ prefix: '/admin' });
    router.get('/leak', (ctx) => {
      ctx.body = 'open';
    });
    router.use(buildRequirePortalSession({} as Provider));
    router.get('/safe', (ctx) => {
      ctx.body = 'closed';
    });
    const app = new Koa();
    app.use(router.routes());
    const leaky = await serve(app.callback());

    try {
      expect(await unguarded(router, leaky.baseUrl)).toEqual(['GET /admin/leak -> 200']);
    } finally {
      leaky.close();
    }
  });
});
