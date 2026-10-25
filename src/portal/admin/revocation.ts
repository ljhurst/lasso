import type Provider from 'oidc-provider';
import { listGrants } from '#src/portal/admin/data.ts';

/**
 * Revokes every grant the account holds that includes `scope` on any
 * resource, along with the tokens issued under it, so the account's next
 * authorization re-consents from its current roles.
 */
export async function revokeGrantsWithScope(
  provider: Provider,
  sub: string,
  scope: string,
): Promise<void> {
  const rows = (await listGrants()).filter((row) => row.accountId === sub);

  for (const row of rows) {
    const grant = await provider.Grant.find(row.id);
    if (!grant || !grantIncludesScope(grant, scope)) {
      continue;
    }

    await provider.AccessToken.revokeByGrantId(grant.jti);
    await provider.AuthorizationCode.revokeByGrantId(grant.jti);
    await provider.RefreshToken.revokeByGrantId(grant.jti);
    await grant.destroy();
  }
}

function grantIncludesScope(grant: InstanceType<Provider['Grant']>, scope: string): boolean {
  return Object.keys(grant.resources ?? {}).some((indicator) =>
    grant.getResourceScope(indicator).split(' ').includes(scope),
  );
}
