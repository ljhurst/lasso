import { describe, expect, it } from 'vitest';
import { migrateClientRow } from '#src/clients/migrate-row.ts';

const CREATED = '2026-11-19T04:30:00.000Z';

const portoVictoria = {
  clientId: 'porto-victoria',
  name: 'Porto to Victoria',
  authMethod: 'client_secret_basic',
  grantTypes: ['client_credentials'],
  redirectUris: [],
  postLogoutRedirectUris: [],
  scope: 'victoria:read victoria:write',
  secretSsmParam: '/lasso/client/porto-victoria-secret',
  createdAt: CREATED,
};

const lassoPortal = {
  clientId: 'lasso-portal',
  name: 'Lasso Portal',
  authMethod: 'none',
  grantTypes: ['authorization_code'],
  redirectUris: [
    'http://localhost:8080/portal/callback',
    'https://lasso.bylukehurst.com/portal/callback',
  ],
  postLogoutRedirectUris: [],
  applicationType: 'web',
  createdAt: CREATED,
};

describe('migrateClientRow', () => {
  it('turns a confidential client into standard metadata and drops the secret parameter name', () => {
    expect(migrateClientRow(portoVictoria)).toEqual({
      clientId: 'porto-victoria',
      createdAt: CREATED,
      metadata: {
        client_id: 'porto-victoria',
        client_name: 'Porto to Victoria',
        token_endpoint_auth_method: 'client_secret_basic',
        grant_types: ['client_credentials'],
        response_types: [],
        scope: 'victoria:read victoria:write',
      },
    });
  });

  it('keeps a code-flow client without refresh as it was', () => {
    expect(migrateClientRow(lassoPortal)?.metadata).toEqual({
      client_id: 'lasso-portal',
      client_name: 'Lasso Portal',
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
      redirect_uris: lassoPortal.redirectUris,
      application_type: 'web',
    });
  });

  it('carries post-logout uris and a native application type', () => {
    const migrated = migrateClientRow({
      ...lassoPortal,
      clientId: 'mcp-inspector',
      grantTypes: ['authorization_code', 'refresh_token'],
      postLogoutRedirectUris: ['http://localhost:4321/'],
      applicationType: 'native',
    });

    expect(migrated?.metadata).toMatchObject({
      grant_types: ['authorization_code', 'refresh_token'],
      post_logout_redirect_uris: ['http://localhost:4321/'],
      application_type: 'native',
    });
  });

  it('leaves no first-shape attribute behind', () => {
    const migrated = migrateClientRow(lassoPortal) as unknown as Record<string, unknown>;

    expect(Object.keys(migrated).sort()).toEqual(['clientId', 'createdAt', 'metadata']);
  });

  it('skips a row that is already migrated', () => {
    const migrated = migrateClientRow(portoVictoria);

    expect(migrated && migrateClientRow({ ...migrated })).toBeUndefined();
  });
});
