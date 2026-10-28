import type Provider from 'oidc-provider';
import { listGrants } from '#src/portal/admin/data.ts';

type Grant = InstanceType<Provider['Grant']>;

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
  await revokeGrantsWhere(provider, sub, (grant) => grantIncludesScope(grant, scope));
}

/**
 * Revokes every grant the account holds that rejected `scope`. A rejected
 * scope counts as already handled, so without this a grant made before the
 * account held the role would never offer the scope again.
 */
export async function revokeGrantsRejectingScope(
  provider: Provider,
  sub: string,
  scope: string,
): Promise<void> {
  await revokeGrantsWhere(provider, sub, (grant) => grantRejectsScope(grant, scope));
}

async function revokeGrantsWhere(
  provider: Provider,
  sub: string,
  matches: (grant: Grant) => boolean,
): Promise<void> {
  const rows = (await listGrants()).filter((row) => row.accountId === sub);

  for (const row of rows) {
    const grant = await provider.Grant.find(row.id);
    if (!grant || !matches(grant)) {
      continue;
    }

    await provider.AccessToken.revokeByGrantId(grant.jti);
    await provider.AuthorizationCode.revokeByGrantId(grant.jti);
    await provider.RefreshToken.revokeByGrantId(grant.jti);
    await grant.destroy();
  }
}

function grantIncludesScope(grant: Grant, scope: string): boolean {
  return Object.keys(grant.resources ?? {}).some((indicator) =>
    grant.getResourceScope(indicator).split(' ').includes(scope),
  );
}

function grantRejectsScope(grant: Grant, scope: string): boolean {
  return Object.keys(grant.rejected?.resources ?? {}).some((indicator) =>
    grant.getRejectedResourceScope(indicator).split(' ').includes(scope),
  );
}
