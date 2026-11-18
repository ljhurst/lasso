import type Provider from 'oidc-provider';
import { listGrants, listSessions } from '#src/adapter/records.ts';

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

/**
 * Ends every browser session the account holds, then revokes every grant and
 * the tokens issued under it. Sessions go first so no sign-in is left that
 * could start a new grant.
 */
export async function revokeAllAccess(provider: Provider, sub: string): Promise<void> {
  const sessions = (await listSessions()).filter((row) => row.accountId === sub);
  for (const row of sessions) {
    const session = await provider.Session.find(row.id);
    await session?.destroy();
  }

  await revokeGrantsWhere(provider, sub, () => true);
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
