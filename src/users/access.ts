/** Splits requested scopes by whether the roles hold them. */
export function partitionScopeByRoles(
  requestedScope: string[],
  roles: string[],
): { granted: string[]; denied: string[] } {
  return {
    granted: requestedScope.filter((scope) => roles.includes(scope)),
    denied: requestedScope.filter((scope) => !roles.includes(scope)),
  };
}
