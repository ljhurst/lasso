import { allResourceScopes } from '#src/config/resources.ts';
import { LASSO_ADMIN_SCOPE } from '#src/config/scopes.ts';
import { PORTAL_CLIENT_ID } from '#src/portal/auth/portal-client.ts';

/** The portal signs admins in through its own client, so editing or deleting it would lock them out. */
export function canManageClient(clientId: string): boolean {
  return clientId !== PORTAL_CLIENT_ID;
}

/** Scopes a client may hold. The admin scope is excluded so a leaked client secret can never reach the admin API. */
export const assignableClientScopes = allResourceScopes.filter(
  (scope) => scope !== LASSO_ADMIN_SCOPE,
);
