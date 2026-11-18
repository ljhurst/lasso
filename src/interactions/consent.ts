import type Provider from 'oidc-provider';
import { partitionScopeByRoles } from '#src/users/access.ts';

type Grant = InstanceType<Provider['Grant']>;

/**
 * Grants each requested resource scope the roles allow and rejects the rest.
 * oidc-provider keeps prompting for consent until every requested scope is
 * granted or rejected, so leaving a denied scope unrecorded loops the browser.
 * Reports whether the grant ends up with any scope for the requested resources.
 */
export function applyResourceConsent(
  grant: Grant,
  missingResourceScopes: Record<string, string[]>,
  roles: string[],
): { grantedAny: boolean } {
  for (const [indicator, scope] of Object.entries(missingResourceScopes)) {
    const { granted, denied } = partitionScopeByRoles(scope, roles);
    if (granted.length > 0) {
      grant.addResourceScope(indicator, granted.join(' '));
    }
    if (denied.length > 0) {
      grant.rejectResourceScope(indicator, denied.join(' '));
    }
  }

  const grantedAny = Object.keys(missingResourceScopes).some(
    (indicator) => grant.getResourceScope(indicator) !== '',
  );
  return { grantedAny };
}
