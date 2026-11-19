import type { RegisteredClient } from '#src/clients/types.ts';

export const MAX_CLIENT_NAME_LENGTH = 100;
export const MAX_REDIRECT_URIS = 10;
const CLIENT_ID_SHAPE = /^[a-z0-9][a-z0-9-]{1,62}$/;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The first problem with a client, or undefined when it is safe to store. `knownScopes` are the scopes Lasso issues. */
export function validateClient(
  clientId: string,
  client: RegisteredClient,
  knownScopes: readonly string[],
): string | undefined {
  if (!CLIENT_ID_SHAPE.test(clientId)) {
    return 'Client ID must be 2-63 lowercase letters, digits or hyphens, starting with a letter or digit.';
  }
  if (client.client_name.length === 0 || client.client_name.length > MAX_CLIENT_NAME_LENGTH) {
    return `Name must be 1-${MAX_CLIENT_NAME_LENGTH} characters.`;
  }
  if (client.grant_types.length === 0) {
    return 'Choose at least one grant type.';
  }
  return validateGrants(client, knownScopes) ?? validateUris(client);
}

function validateGrants(
  client: RegisteredClient,
  knownScopes: readonly string[],
): string | undefined {
  const usesCodeFlow = client.grant_types.includes('authorization_code');
  const usesClientCredentials = client.grant_types.includes('client_credentials');
  const isPublic = client.token_endpoint_auth_method === 'none';

  if (usesCodeFlow && usesClientCredentials) {
    return 'A client signs users in or authenticates itself, not both.';
  }
  if (client.grant_types.includes('refresh_token') && !usesCodeFlow) {
    return 'Refresh tokens need the authorization code grant.';
  }
  if (usesClientCredentials && isPublic) {
    return 'Clients that authenticate themselves need a secret.';
  }
  if (usesCodeFlow && !isPublic) {
    return 'Clients that sign users in are public and use PKCE, with no secret.';
  }
  if (usesClientCredentials) {
    const scopes = client.scope?.split(' ').filter(Boolean) ?? [];
    if (scopes.length === 0 || scopes.some((scope) => !knownScopes.includes(scope))) {
      return 'Choose one or more scopes Lasso issues.';
    }
  }
  return undefined;
}

function validateUris(client: RegisteredClient): string | undefined {
  const redirectUris = client.redirect_uris ?? [];
  const postLogoutUris = client.post_logout_redirect_uris ?? [];
  const usesCodeFlow = client.grant_types.includes('authorization_code');

  if (usesCodeFlow && redirectUris.length === 0) {
    return 'Add at least one redirect URI.';
  }
  if (!usesCodeFlow && redirectUris.length + postLogoutUris.length > 0) {
    return 'Only clients that sign users in take redirect URIs.';
  }
  if (redirectUris.length > MAX_REDIRECT_URIS || postLogoutUris.length > MAX_REDIRECT_URIS) {
    return `Use at most ${MAX_REDIRECT_URIS} redirect URIs of each kind.`;
  }

  const bad = [...redirectUris, ...postLogoutUris].find((uri) => !isAllowedRedirectUri(uri));
  return bad && `Redirect URI not allowed: ${bad}. Use https, or http on localhost.`;
}

function isAllowedRedirectUri(value: string): boolean {
  const url = URL.parse(value);
  if (url?.hash !== '' || url.username !== '' || url.password !== '') {
    return false;
  }
  return (
    url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname))
  );
}
