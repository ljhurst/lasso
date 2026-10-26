import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    env: {
      LASSO_OIDC_TABLE_NAME: 'lj-lasso-test',
      LASSO_USERS_TABLE_NAME: 'lj-lasso-users-test',
      LASSO_THROTTLE_TABLE_NAME: 'lj-lasso-throttle-test',
      LASSO_JWKS_SSM_PARAM: '/lasso/jwks-test',
      LASSO_COOKIE_KEY_SSM_PARAM: '/lasso/cookie-key-test',
      LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM: '/lasso/porto-victoria-client-secret-test',
      LASSO_ISSUER: 'https://lasso.example.com',
    },
  },
});
