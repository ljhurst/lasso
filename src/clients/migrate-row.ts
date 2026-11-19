import type { ClientRecord, GrantType } from '#src/clients/types.ts';

interface FirstShapeRow {
  clientId: string;
  name: string;
  authMethod: 'none' | 'client_secret_basic';
  grantTypes: GrantType[];
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  applicationType?: 'web' | 'native';
  scope?: string;
  createdAt: string;
}

/** The row in the current shape, or undefined when it already is. */
export function migrateClientRow(row: Record<string, unknown>): ClientRecord | undefined {
  if ('metadata' in row) {
    return undefined;
  }
  const old = row as unknown as FirstShapeRow;
  const usesCodeFlow = old.grantTypes.includes('authorization_code');

  return {
    clientId: old.clientId,
    createdAt: old.createdAt,
    metadata: {
      client_id: old.clientId,
      client_name: old.name,
      token_endpoint_auth_method: old.authMethod,
      grant_types: old.grantTypes,
      response_types: usesCodeFlow ? ['code'] : [],
      ...(old.redirectUris.length > 0 && { redirect_uris: old.redirectUris }),
      ...(old.postLogoutRedirectUris.length > 0 && {
        post_logout_redirect_uris: old.postLogoutRedirectUris,
      }),
      ...(old.applicationType && { application_type: old.applicationType }),
      ...(old.scope && { scope: old.scope }),
    },
  };
}
