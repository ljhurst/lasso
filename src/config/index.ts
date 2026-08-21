import type { Account, Configuration } from 'oidc-provider';
import { DynamoAdapter } from '../adapter/dynamo-adapter.ts';
import { clients } from './clients.ts';
import { getJwks } from './jwks.ts';
import { getResourceServerInfo } from './resources.ts';

// Single hardcoded user (DESIGN §6) — no signup, no multi-tenant lookup.
async function findAccount(_ctx: unknown, sub: string): Promise<Account> {
  return {
    accountId: sub,
    async claims(): Promise<{ sub: string }> {
      return { sub };
    },
  };
}

export async function buildConfiguration(): Promise<Configuration> {
  return {
    adapter: DynamoAdapter,
    clients,
    findAccount,
    jwks: await getJwks(),
    features: {
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
