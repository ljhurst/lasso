export type GrantType = 'authorization_code' | 'refresh_token' | 'client_credentials';

export type AuthMethod = 'none' | 'client_secret_basic';

export type ApplicationType = 'web' | 'native';

/** Public clients cannot keep a secret and sign users in; confidential clients hold one and authenticate themselves. */
export type ClientType = 'public' | 'confidential';

/**
 * The client metadata Lasso registers, named as in the OAuth and OIDC client
 * registration specs. The client's identifier is the row's key, so it is not
 * repeated here.
 */
export interface RegisteredClient {
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

/** The scopes a client may ask for; empty for a client that holds none. */
export function scopesOf(metadata: Pick<RegisteredClient, 'scope'>): string[] {
  return metadata.scope?.split(' ').filter(Boolean) ?? [];
}

export function clientTypeOf(
  metadata: Pick<RegisteredClient, 'token_endpoint_auth_method'>,
): ClientType {
  return metadata.token_endpoint_auth_method === 'none' ? 'public' : 'confidential';
}
