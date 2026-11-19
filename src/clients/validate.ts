import { AuthMethod, type ClientRecord, GrantType } from '#src/clients/types.ts';

export const MAX_CLIENT_NAME_LENGTH = 100;
export const MAX_REDIRECT_URIS = 10;
const CLIENT_ID_SHAPE = /^[a-z0-9][a-z0-9-]{1,62}$/;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function secretSsmParamFor(clientId: string): string {
  return `/lasso/client/${clientId}-secret`;
}

/** The first problem with a client, or undefined when it is safe to store. `knownScopes` are the scopes Lasso issues. */
export function validateClient(
  record: ClientRecord,
  knownScopes: readonly string[],
): string | undefined {
  if (!CLIENT_ID_SHAPE.test(record.clientId)) {
    return 'Client ID must be 2-63 lowercase letters, digits or hyphens, starting with a letter or digit.';
  }
  if (record.name.length === 0 || record.name.length > MAX_CLIENT_NAME_LENGTH) {
    return `Name must be 1-${MAX_CLIENT_NAME_LENGTH} characters.`;
  }
  if (record.grantTypes.length === 0) {
    return 'Choose at least one grant type.';
  }
  return validateGrants(record, knownScopes) ?? validateUris(record);
}

function validateGrants(record: ClientRecord, knownScopes: readonly string[]): string | undefined {
  const usesCodeFlow = record.grantTypes.includes(GrantType.AuthorizationCode);
  const usesClientCredentials = record.grantTypes.includes(GrantType.ClientCredentials);

  if (usesCodeFlow && usesClientCredentials) {
    return 'A client signs users in or authenticates itself, not both.';
  }
  if (record.grantTypes.includes(GrantType.RefreshToken) && !usesCodeFlow) {
    return 'Refresh tokens need the authorization code grant.';
  }
  if (usesClientCredentials && record.authMethod !== AuthMethod.SecretBasic) {
    return 'Clients that authenticate themselves need a secret.';
  }
  if (usesClientCredentials) {
    const scopes = record.scope?.split(' ').filter(Boolean) ?? [];
    if (scopes.length === 0 || scopes.some((scope) => !knownScopes.includes(scope))) {
      return 'Choose one or more scopes Lasso issues.';
    }
  }
  if (record.authMethod === AuthMethod.SecretBasic && !record.secretSsmParam) {
    return 'A client with a secret needs a secret parameter.';
  }
  if (record.secretSsmParam && record.secretSsmParam !== secretSsmParamFor(record.clientId)) {
    return `The secret parameter must be ${secretSsmParamFor(record.clientId)}.`;
  }
  if (record.authMethod === AuthMethod.None && record.secretSsmParam) {
    return 'A client without a secret cannot have a secret parameter.';
  }
  return undefined;
}

function validateUris(record: ClientRecord): string | undefined {
  const usesCodeFlow = record.grantTypes.includes(GrantType.AuthorizationCode);

  if (usesCodeFlow && record.redirectUris.length === 0) {
    return 'Add at least one redirect URI.';
  }
  if (!usesCodeFlow && record.redirectUris.length + record.postLogoutRedirectUris.length > 0) {
    return 'Only clients that sign users in take redirect URIs.';
  }
  if (
    record.redirectUris.length > MAX_REDIRECT_URIS ||
    record.postLogoutRedirectUris.length > MAX_REDIRECT_URIS
  ) {
    return `Use at most ${MAX_REDIRECT_URIS} redirect URIs of each kind.`;
  }

  const bad = [...record.redirectUris, ...record.postLogoutRedirectUris].find(
    (uri) => !isAllowedRedirectUri(uri),
  );
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
