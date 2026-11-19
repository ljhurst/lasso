import { LASSO_ADMIN_SCOPE } from '#src/resources/scopes.ts';
import { PORTAL_CLIENT_ID } from '#src/portal/auth/portal-client.ts';

/** The portal signs admins in through its own client, so editing or deleting it would lock them out. */
export function canManageClient(clientId: string): boolean {
  return clientId !== PORTAL_CLIENT_ID;
}

/** Of the scopes resources offer, those a client may hold. The admin scope is excluded so a leaked client secret can never reach the admin API. */
export function assignableClientScopes(offered: readonly string[]): string[] {
  return offered.filter((scope) => scope !== LASSO_ADMIN_SCOPE);
}
