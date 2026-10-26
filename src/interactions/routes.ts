import Router from '@koa/router';
import type Koa from 'koa';
import type Provider from 'oidc-provider';

import { readForm } from '#src/form-body.ts';
import { hashPassword, verifyPassword } from '#src/users/password.ts';
import { getUserByEmail, getUserBySub, updatePassword } from '#src/users/store.ts';
import type { User } from '#src/users/types.ts';
import { ChangePasswordPage } from '#src/interactions/views/change-password.tsx';
import { LoginPage } from '#src/interactions/views/login.tsx';

interface ConsentPromptDetails {
  missingOIDCScope?: string[];
  missingOIDCClaims?: string[];
  missingResourceScopes?: Record<string, string[]>;
}

export function filterGrantedScope(requestedScope: string[], roles: string[]): string[] {
  return requestedScope.filter((scope) => roles.includes(scope));
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
    const user = await getUserBySub(session.accountId);
    if (!user) {
      throw new Error(`no user found for sub ${session.accountId}`);
    }

    for (const [indicator, scope] of Object.entries(missingResourceScopes)) {
      const grantedScope = filterGrantedScope(scope, user.roles);
      if (grantedScope.length > 0) {
        grant.addResourceScope(indicator, grantedScope.join(' '));
      }
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

  router.post('/interaction/:uid/login', async (ctx) => {
    const { uid } = await provider.interactionDetails(ctx.req, ctx.res);
    const form = await readForm(ctx);
    const email = form.get('email');
    const password = form.get('password');

    const user = await authenticate(email, password);

    if (!user) {
      ctx.type = 'html';
      ctx.body = await LoginPage({ uid, error: 'Invalid email or password' });
      return;
    }

    if (user.mustChangePassword) {
      ctx.type = 'html';
      ctx.body = await ChangePasswordPage({ uid, email: user.email });
      return;
    }

    const result = {
      login: { accountId: user.sub },
    };

    await provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  router.post('/interaction/:uid/change-password', async (ctx) => {
    const { uid } = await provider.interactionDetails(ctx.req, ctx.res);
    const form = await readForm(ctx);
    const email = form.get('email');
    const current = form.get('current');
    const password = form.get('password');
    const confirm = form.get('confirm');

    const user = await authenticate(email, current);
    if (!user) {
      ctx.type = 'html';
      ctx.body = await ChangePasswordPage({
        uid,
        email: email ?? '',
        error: 'Invalid email or temporary password',
      });
      return;
    }

    if (!user.mustChangePassword) {
      ctx.status = 400;
      return;
    }

    if (!password || password !== confirm) {
      ctx.type = 'html';
      ctx.body = await ChangePasswordPage({
        uid,
        email: user.email,
        error: 'Passwords did not match',
      });
      return;
    }

    if (password === current) {
      ctx.type = 'html';
      ctx.body = await ChangePasswordPage({
        uid,
        email: user.email,
        error: 'Choose a password different from the temporary one',
      });
      return;
    }

    const { hash, salt } = await hashPassword(password);
    await updatePassword(user.sub, { hash, salt });

    const result = {
      login: { accountId: user.sub },
    };

    await provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  return router;
}

async function authenticate(
  email: string | null,
  password: string | null,
): Promise<User | undefined> {
  const user = email ? await getUserByEmail(email) : undefined;
  const valid =
    password &&
    user &&
    (await verifyPassword(password, { hash: user.passwordHash, salt: user.passwordSalt }));
  return valid ? user : undefined;
}
