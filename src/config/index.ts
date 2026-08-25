import type { Account, Configuration } from 'oidc-provider';
import { DynamoAdapter } from '../adapter/dynamo-adapter.ts';
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
    },
    interactions: {
      url: (_ctx, interaction) => `/interaction/${interaction.uid}`,
    },
  };
}
