import Router from '@koa/router';
import type Koa from 'koa';
import type Provider from 'oidc-provider';

import { clientIp } from '#src/auth/client-ip.ts';
import { readForm } from '#src/form-body.ts';
import {
  hashPassword,
  passwordPolicyError,
  rejectPassword,
  verifyPassword,
} from '#src/users/password.ts';
import { clearLoginAttempts, reserveLoginAttempt } from '#src/users/login-throttle.ts';
import { getUserByEmail, getUserBySub, updatePassword } from '#src/users/store.ts';
import type { User } from '#src/users/types.ts';
import { ChangePasswordPage } from '#src/interactions/views/change-password.tsx';
import { LoginPage } from '#src/interactions/views/login.tsx';

interface ConsentPromptDetails {
  missingOIDCScope?: string[];
  missingOIDCClaims?: string[];
  missingResourceScopes?: Record<string, string[]>;
}

type Grant = InstanceType<Provider['Grant']>;

export function partitionScopeByRoles(
  requestedScope: string[],
  roles: string[],
): { granted: string[]; denied: string[] } {
  return {
    granted: requestedScope.filter((scope) => roles.includes(scope)),
    denied: requestedScope.filter((scope) => !roles.includes(scope)),
  };
}

/**
 * Grants each requested resource scope the roles allow and rejects the rest.
 * oidc-provider keeps prompting for consent until every requested scope is
 * granted or rejected, so leaving a denied scope unrecorded loops the browser.
 * Reports whether the grant ends up with any scope for the requested resources.
 */
export function applyResourceConsent(
  grant: Grant,
  missingResourceScopes: Record<string, string[]>,
  roles: string[],
): { grantedAny: boolean } {
  for (const [indicator, scope] of Object.entries(missingResourceScopes)) {
    const { granted, denied } = partitionScopeByRoles(scope, roles);
    if (granted.length > 0) {
      grant.addResourceScope(indicator, granted.join(' '));
    }
    if (denied.length > 0) {
      grant.rejectResourceScope(indicator, denied.join(' '));
    }
  }

  const grantedAny = Object.keys(missingResourceScopes).some(
    (indicator) => grant.getResourceScope(indicator) !== '',
  );
  return { grantedAny };
}

export async function grantConsent(provider: Provider, ctx: Koa.Context): Promise<void> {
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

    const { grantedAny } = applyResourceConsent(grant, missingResourceScopes, user.roles);
    if (!grantedAny) {
      await provider.interactionFinished(ctx.req, ctx.res, {
        error: 'access_denied',
        error_description: 'the account holds none of the requested scopes',
      });
      return;
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

    const user = await authenticate(email, password, clientIp(ctx));

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

    const user = await authenticate(email, current, clientIp(ctx));
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

    const rejectNewPassword = async (error: string): Promise<void> => {
      ctx.type = 'html';
      ctx.body = await ChangePasswordPage({ uid, email: user.email, error });
    };

    if (!password || password !== confirm) {
      return rejectNewPassword('Passwords did not match');
    }

    const policyError = passwordPolicyError(password);
    if (policyError) {
      return rejectNewPassword(policyError);
    }

    if (password === current) {
      return rejectNewPassword('Choose a password different from the temporary one');
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
  ip: string,
): Promise<User | undefined> {
  const user = email ? await getUserByEmail(email) : undefined;
  const candidate = password ?? '';
  if (!user || !(await reserveLoginAttempt(user.sub, ip))) {
    await rejectPassword(candidate);
    return undefined;
  }

  const valid = await verifyPassword(candidate, {
    hash: user.passwordHash,
    salt: user.passwordSalt,
  });
  if (!valid) {
    return undefined;
  }
  await clearLoginAttempts(user.sub, ip);
  return user;
}
