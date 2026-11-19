import type { ClientType } from '#src/clients/types.ts';

export const CLIENT_TYPE_DESCRIPTION: Record<ClientType, string> = {
  public: 'Public (user sign-in, PKCE, no secret)',
  confidential: 'Confidential (client credentials, with a secret)',
};

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  public: 'Public',
  confidential: 'Confidential',
};
