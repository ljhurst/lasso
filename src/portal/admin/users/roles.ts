import type Provider from 'oidc-provider';
import { revokeGrantsRejectingScope } from '#src/portal/admin/revocation.ts';
import { addRole } from '#src/users/storage/store.ts';

/**
 * Gives `sub` the role, then clears any grant that rejected it. The role goes
 * first so a login between the two steps sees it; repeating the call retries
 * a failed revocation because adding a held role is a no-op.
 */
export async function assignRole(provider: Provider, sub: string, role: string): Promise<void> {
  await addRole(sub, role);
  await revokeGrantsRejectingScope(provider, sub, role);
}
