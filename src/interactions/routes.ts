import Router from '@koa/router';
import type Koa from 'koa';
import koaBody from 'koa-body';
import type Provider from 'oidc-provider';

import { hashPassword, verifyPassword } from '../users/password.ts';
import { getUserByEmail, getUserBySub, updatePassword } from '../users/store.ts';
import { ChangePasswordPage } from './views/change-password.tsx';
import { LoginPage } from './views/login.tsx';

interface ConsentPromptDetails {
  missingOIDCScope?: string[];
  missingOIDCClaims?: string[];
  missingResourceScopes?: Record<string, string[]>;
}

async function grantConsent(provider: Provider, ctx: Koa.Context): Promise<void> {
  const details = await provider.interactionDetails(ctx.req, ctx.res);
  const { session, params, grantId, prompt } = details;
  if (!session?.accountId) {
    throw new Error('consent requested without an authenticated session');
  }

  const grant = grantId
    ? await provider.Grant.find(grantId)
    : new provider.Grant({
        accountId: session.accountId,
        clientId: params.client_id as string,
      });
  if (!grant) {
    throw new Error(`grant ${grantId} not found`);
  }

  const { missingOIDCScope, missingOIDCClaims, missingResourceScopes } =
    prompt.details as ConsentPromptDetails;
  if (missingOIDCScope) {
    grant.addOIDCScope(missingOIDCScope.join(' '));
  }
  if (missingOIDCClaims) {
    grant.addOIDCClaims(missingOIDCClaims);
  }
  if (missingResourceScopes) {
    for (const [indicator, scope] of Object.entries(missingResourceScopes)) {
      grant.addResourceScope(indicator, scope.join(' '));
    }
  }

  const result = { consent: { grantId: await grant.save() } };
  await provider.interactionFinished(ctx.req, ctx.res, result, { mergeWithLastSubmission: true });
}

export function buildInteractionRouter(provider: Provider): Router {
  const router = new Router();

  router.get('/interaction/:uid', async (ctx) => {
    const details = await provider.interactionDetails(ctx.req, ctx.res);

    if (details.prompt.name === 'consent') {
      await grantConsent(provider, ctx);
      return;
    }

    ctx.type = 'html';
    ctx.body = await LoginPage({ uid: details.uid });
  });

  router.post('/interaction/:uid/login', koaBody(), async (ctx) => {
    const { uid } = await provider.interactionDetails(ctx.req, ctx.res);
    const { email, password } = ctx.request.body as { email?: string; password?: string };

    const user = email ? await getUserByEmail(email) : undefined;
    const valid =
      password &&
      user &&
      (await verifyPassword(password, { hash: user.passwordHash, salt: user.passwordSalt }));

    if (!valid || !user) {
      ctx.type = 'html';
      ctx.body = await LoginPage({ uid, error: 'Invalid email or password' });
      return;
    }

    if (user.mustChangePassword) {
      ctx.type = 'html';
      ctx.body = await ChangePasswordPage({ uid, sub: user.sub });
      return;
    }

    const result = {
      login: { accountId: user.sub },
    };

    await provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  router.post('/interaction/:uid/change-password', koaBody(), async (ctx) => {
    const { uid } = await provider.interactionDetails(ctx.req, ctx.res);
    const { sub, password, confirm } = ctx.request.body as {
      sub?: string;
      password?: string;
      confirm?: string;
    };

    if (!sub || !password || password !== confirm) {
      ctx.type = 'html';
      ctx.body = await ChangePasswordPage({
        uid,
        sub: sub ?? '',
        error: 'Passwords did not match',
      });
      return;
    }

    const user = await getUserBySub(sub);
    if (!user) {
      throw new Error(`no user found for sub ${sub}`);
    }

    const { hash, salt } = await hashPassword(password);
    await updatePassword(sub, { hash, salt });

    const result = {
      login: { accountId: sub },
    };

    await provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  return router;
}
