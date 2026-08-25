function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 8080),
  oidcTableName: required('LASSO_OIDC_TABLE_NAME'),
  usersTableName: required('LASSO_USERS_TABLE_NAME'),
  jwksSsmParam: required('LASSO_JWKS_SSM_PARAM'),
  clientSecretSsmParams: {
    portoVictoria: required('LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM'),
  },
  issuer: required('LASSO_ISSUER'),
};
