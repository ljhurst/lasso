/** Where a client's secret lives; derived from the id so a stored client can never point at another's. */
export function secretParamFor(clientId: string): string {
  return `/lasso/client/${clientId}-secret`;
}
