import type { Account, Configuration } from 'oidc-provider';
import { DynamoAdapter } from '../adapter/dynamo-adapter.ts';
import { clients } from './clients.ts';
import { getJwks } from './jwks.ts';
import { getResourceServerInfo } from './resources.ts';

async function findAccount(_ctx: unknown, sub: string): Promise<Account> {
  return {
    accountId: sub,
    async claims(): Promise<{ sub: string }> {
      return { sub };
    },
  };
}

const ONE_HOUR = 60 * 60;
const FOURTEEN_DAYS = 14 * 24 * 60 * 60;

export async function buildConfiguration(): Promise<Configuration> {
  return {
    adapter: DynamoAdapter,
    clients,
    findAccount,
    jwks: await getJwks(),
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
    },
    interactions: {
      url: (_ctx, interaction) => `/interaction/${interaction.uid}`,
    },
  };
}
