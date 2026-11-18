import type Provider from 'oidc-provider';
import { vi } from 'vitest';
import { primaryKey } from '#src/adapter/keys.ts';

export const FIFE = 'https://fife.example.com';
export const PORTO = 'https://porto.example.com';

export function grantRow(id: string, accountId: string) {
  return { pk: primaryKey('Grant', id), id, modelName: 'Grant', payload: { accountId } };
}

export function stubGrant(
  jti: string,
  resources: Record<string, string>,
  calls: string[],
  rejected: Record<string, string> = {},
) {
  return {
    jti,
    resources,
    rejected: { resources: rejected },
    getResourceScope: (indicator: string) => resources[indicator] ?? '',
    getRejectedResourceScope: (indicator: string) => rejected[indicator] ?? '',
    destroy: vi.fn(async () => {
      calls.push(`destroy:${jti}`);
    }),
  };
}

export function stubRevoker(label: string, calls: string[]) {
  return {
    revokeByGrantId: vi.fn(async (grantId: string) => {
      calls.push(`${label}:${grantId}`);
    }),
  };
}

export function stubProvider(
  grants: Record<string, ReturnType<typeof stubGrant>>,
  calls: string[],
) {
  return {
    Grant: { find: vi.fn(async (id: string) => grants[id]) },
    AccessToken: stubRevoker('revoke-at', calls),
    AuthorizationCode: stubRevoker('revoke-code', calls),
    RefreshToken: stubRevoker('revoke-rt', calls),
  } as unknown as Provider;
}
