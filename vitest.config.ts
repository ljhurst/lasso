import { readFile } from 'node:fs/promises';
import { defineConfig, type Plugin } from 'vitest/config';

const TEXT_MODULE_PREFIX = '\0text:';
const TEXT_MODULE_SUFFIX = '#';
const TEXT_FILES = /\.css$|\/page\.js$/;

// The bundler and the dev server read these files as text through the
// `with { type: 'text' }` import attribute; vitest doesn't hand plugins the
// attribute, so it matches the files by name.
function textImports(): Plugin {
  return {
    name: 'text-imports',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!TEXT_FILES.test(source)) {
        return null;
      }
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved ? `${TEXT_MODULE_PREFIX}${resolved.id}${TEXT_MODULE_SUFFIX}` : null;
    },
    async load(id) {
      if (!id.startsWith(TEXT_MODULE_PREFIX)) {
        return null;
      }
      const file = id.slice(TEXT_MODULE_PREFIX.length, -TEXT_MODULE_SUFFIX.length);
      const text = await readFile(file, 'utf8');
      return `export default ${JSON.stringify(text)};`;
    },
  };
}

export default defineConfig({
  plugins: [textImports()],
  test: {
    include: ['test/**/*.test.ts'],
    env: {
      LASSO_OIDC_TABLE_NAME: 'lj-lasso-test',
      LASSO_USERS_TABLE_NAME: 'lj-lasso-users-test',
      LASSO_CLIENTS_TABLE_NAME: 'lj-lasso-clients-test',
      LASSO_THROTTLE_TABLE_NAME: 'lj-lasso-throttle-test',
      LASSO_JWKS_SSM_PARAM: '/lasso/jwks-test',
      LASSO_COOKIE_KEY_SSM_PARAM: '/lasso/cookie-key-test',
      LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM: '/lasso/porto-victoria-client-secret-test',
      LASSO_ISSUER: 'https://lasso.example.com',
    },
  },
});
