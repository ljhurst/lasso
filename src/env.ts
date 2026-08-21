function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 8080),
  tableName: required('TABLE_NAME'),
  jwksSsmParam: required('JWKS_SSM_PARAM'),
  credentialSsmParam: required('CREDENTIAL_SSM_PARAM'),
  issuer: required('ISSUER'),
};
