import Router from '@koa/router';
import koaBody from 'koa-body';
import type Provider from 'oidc-provider';

import { verifyCredentials } from './credentials.ts';
import { renderLogin } from './views/login.ts';

export function buildInteractionRouter(provider: Provider): Router {
  const router = new Router();

  router.get('/interaction/:uid', async (ctx) => {
    const { uid } = await provider.interactionDetails(ctx.req, ctx.res);
    ctx.type = 'html';
    ctx.body = renderLogin(uid);
  });

  router.post('/interaction/:uid/login', koaBody(), async (ctx) => {
    const { uid } = await provider.interactionDetails(ctx.req, ctx.res);
    const { username, password } = ctx.request.body as { username?: string; password?: string };

    if (!username || !password || !(await verifyCredentials(username, password))) {
      ctx.type = 'html';
      ctx.body = renderLogin(uid, 'Invalid username or password');
      return;
    }

    const result = {
      login: { accountId: username },
    };

    await provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  return router;
}
