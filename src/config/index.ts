import type { Account, Configuration } from 'oidc-provider';
import { DynamoAdapter } from '../adapter/dynamo-adapter.ts';
import { ErrorPage } from '../interactions/views/error.tsx';
import { LogoutPage } from '../interactions/views/logout.tsx';
import { PostLogoutPage } from '../interactions/views/post-logout.tsx';
import { getUserBySub } from '../users/store.ts';
import { buildClients } from './clients.ts';
import { getJwks } from './jwks.ts';
import { allResourceScopes, getResourceServerInfo } from './resources.ts';

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

export async function buildConfiguration(): Promise<Configuration> {
  return {
    adapter: DynamoAdapter,
    clients: await buildClients(),
    findAccount,
    jwks: await getJwks(),
    scopes: ['openid', 'profile', 'email', 'offline_access', ...allResourceScopes],
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
        getResourceServerInfo: (_ctx, resourceIndicator) =>
          getResourceServerInfo(resourceIndicator),
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
