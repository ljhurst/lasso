import { type Account, type Configuration, errors } from 'oidc-provider';
import { DynamoAdapter } from '#src/adapter/dynamo-adapter.ts';
import { ErrorPage } from '#src/interactions/views/error.tsx';
import { LogoutPage } from '#src/interactions/views/logout.tsx';
import { PostLogoutPage } from '#src/interactions/views/post-logout.tsx';
import { getUserBySub } from '#src/users/storage/store.ts';
import { getJwks } from '#src/config/jwks.ts';
import { getParameter, getParameters } from '#src/aws/ssm.ts';
import { env } from '#src/env.ts';
import type { ResourceRegistry } from '#src/resources/registry.ts';

interface AccountClaims {
  [key: string]: unknown;
  sub: string;
  given_name: string;
  family_name: string;
  name: string;
  email: string;
  email_verified: boolean;
}

async function findAccount(_ctx: unknown, sub: string): Promise<Account> {
  return {
    accountId: sub,
    async claims(): Promise<AccountClaims> {
      const user = await getUserBySub(sub);
      if (!user) {
        throw new Error(`no user found for sub ${sub}`);
      }
      return {
        sub,
        given_name: user.givenName,
        family_name: user.familyName,
        name: `${user.givenName} ${user.familyName}`,
        email: user.email,
        email_verified: user.emailVerified,
      };
    },
  };
}

const ONE_HOUR = 60 * 60;
const FOURTEEN_DAYS = 14 * 24 * 60 * 60;

/**
 * The provider's configuration. `resourceScopes` is fixed for the life of the
 * provider, because it also decides which scopes a client may hold and which
 * discovery lists, so a change to the resources needs a new provider.
 */
export async function buildConfiguration(
  registry: ResourceRegistry,
  resourceScopes: readonly string[],
): Promise<Configuration> {
  // Fetch every secret the config reads in one round trip up front, since
  // each sequential network call at startup adds directly to cold-start time.
  await getParameters([env.jwksSsmParam, env.cookieKeySsmParam]);

  return {
    adapter: DynamoAdapter,
    findAccount,
    jwks: await getJwks(),
    cookies: { keys: [await getParameter(env.cookieKeySsmParam)] },
    scopes: ['openid', 'profile', 'email', 'offline_access', ...resourceScopes],
    claims: {
      profile: ['given_name', 'family_name', 'name'],
      email: ['email', 'email_verified'],
    },
    ttl: {
      AccessToken: ONE_HOUR,
      IdToken: ONE_HOUR,
      Interaction: ONE_HOUR,
      Session: FOURTEEN_DAYS,
      Grant: FOURTEEN_DAYS,
    },
    features: {
      devInteractions: { enabled: false },
      resourceIndicators: {
        enabled: true,
        defaultResource: () => '',
        getResourceServerInfo: async (_ctx, resourceIndicator) => {
          const resource = await registry.get(resourceIndicator);
          if (!resource) {
            throw new errors.InvalidTarget();
          }
          return { scope: resource.scopes.join(' '), accessTokenFormat: 'jwt' };
        },
      },
      clientCredentials: { enabled: true },
      rpInitiatedLogout: {
        enabled: true,
        logoutSource: async (ctx, form) => {
          ctx.type = 'html';
          ctx.body = await LogoutPage({ form, clientName: ctx.oidc.client?.clientName });
        },
        postLogoutSuccessSource: async (ctx) => {
          ctx.type = 'html';
          ctx.body = await PostLogoutPage({ clientName: ctx.oidc.client?.clientName });
        },
      },
    },
    interactions: {
      url: (_ctx, interaction) => `/interaction/${interaction.uid}`,
    },
    renderError: async (ctx, out) => {
      ctx.type = 'html';
      ctx.body = await ErrorPage({ error: out.error, errorDescription: out.error_description });
    },
  };
}
