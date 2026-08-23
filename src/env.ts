function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 8080),
  tableName: required('LASSO_DYNAMODB_TABLE_NAME'),
  jwksSsmParam: required('LASSO_JWKS_SSM_PARAM'),
  credentialSsmParam: required('LASSO_CREDENTIAL_SSM_PARAM'),
  clientSecretSsmParams: {
    portoVictoria: required('LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM'),
  },
  issuer: required('LASSO_ISSUER'),
};
