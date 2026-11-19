import type { ClientMetadata } from 'oidc-provider';
import { type ClientRecord, GrantType } from '#src/clients/types.ts';

/** The oidc-provider view of a stored client; `secret` is the plaintext it compares against. */
export function toClientMetadata(record: ClientRecord, secret?: string): ClientMetadata {
  const usesCodeFlow = record.grantTypes.includes(GrantType.AuthorizationCode);
  return {
    client_id: record.clientId,
    client_name: record.name,
    token_endpoint_auth_method: record.authMethod,
    grant_types: record.grantTypes,
    response_types: usesCodeFlow ? ['code'] : [],
    ...(record.redirectUris.length > 0 && { redirect_uris: record.redirectUris }),
    ...(record.postLogoutRedirectUris.length > 0 && {
      post_logout_redirect_uris: record.postLogoutRedirectUris,
    }),
    ...(record.applicationType && { application_type: record.applicationType }),
    ...(record.scope && { scope: record.scope }),
    ...(secret && { client_secret: secret }),
  };
}
