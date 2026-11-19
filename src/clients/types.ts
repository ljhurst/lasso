export type GrantType = 'authorization_code' | 'refresh_token' | 'client_credentials';

export type AuthMethod = 'none' | 'client_secret_basic';

export type ApplicationType = 'web' | 'native';

/** Public clients cannot keep a secret and sign users in; confidential clients hold one and authenticate themselves. */
export type ClientType = 'public' | 'confidential';

/** The client metadata Lasso registers, named as in the OAuth and OIDC client registration specs. */
export interface RegisteredClient {
  client_id: string;
  client_name: string;
  token_endpoint_auth_method: AuthMethod;
  grant_types: GrantType[];
  response_types: string[];
  redirect_uris?: string[];
  post_logout_redirect_uris?: string[];
  application_type?: ApplicationType;
  scope?: string;
}

export interface ClientRecord {
  clientId: string;
  createdAt: string;
  metadata: RegisteredClient;
}

export function clientTypeOf(
  metadata: Pick<RegisteredClient, 'token_endpoint_auth_method'>,
): ClientType {
  return metadata.token_endpoint_auth_method === 'none' ? 'public' : 'confidential';
}
