export const GrantType = {
  AuthorizationCode: 'authorization_code',
  RefreshToken: 'refresh_token',
  ClientCredentials: 'client_credentials',
} as const;

export type GrantType = (typeof GrantType)[keyof typeof GrantType];

export const AuthMethod = {
  None: 'none',
  SecretBasic: 'client_secret_basic',
} as const;

export type AuthMethod = (typeof AuthMethod)[keyof typeof AuthMethod];

export type ApplicationType = 'web' | 'native';

export interface ClientRecord {
  clientId: string;
  name: string;
  authMethod: AuthMethod;
  grantTypes: GrantType[];
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  applicationType?: ApplicationType;
  scope?: string;
  secretSsmParam?: string;
  createdAt: string;
}
