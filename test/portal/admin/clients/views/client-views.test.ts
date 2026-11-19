import { describe, expect, it } from 'vitest';
import { ClientDetailPage } from '#src/portal/admin/clients/views/client-detail.tsx';
import { ClientSecretPage } from '#src/portal/admin/clients/views/client-secret.tsx';
import { DeleteClientPage } from '#src/portal/admin/clients/views/delete-client.tsx';
import { NewClientPage } from '#src/portal/admin/clients/views/new-client.tsx';
import { makeClient, makeConfidentialClient } from '#test/support/clients.ts';

const HOSTILE = '"><img src=x onerror=alert(1)>';
const CHOICES = ['victoria:read', 'victoria:write'];

describe('NewClientPage', () => {
  it('posts to the clients list, once, with every field', async () => {
    const html = await NewClientPage({ scopeChoices: CHOICES });

    expect(html).toMatch(/<form[^>]*action="\/admin\/clients"[^>]*data-once/);
    for (const name of [
      'clientId',
      'name',
      'clientType',
      'redirectUris',
      'postLogoutRedirectUris',
    ]) {
      expect(html).toContain(`name="${name}"`);
    }
    expect(html).toContain('<option value="victoria:read">victoria:read</option>');
  });

  it('picks scopes from a dropdown, not checkboxes', async () => {
    const html = await NewClientPage({ scopeChoices: CHOICES });

    expect(html).not.toMatch(/<input[^>]*type="checkbox"/);
    expect(html).toContain('data-scope-add');
    expect(html).toContain('<option value="">Choose a scope…</option>');
    expect(html).toContain('<ul class="roles" data-scope-list></ul>');
  });

  it('shows chosen scopes as removable rows and leaves them out of the dropdown', async () => {
    const html = await NewClientPage({
      scopeChoices: CHOICES,
      values: {
        clientId: '',
        name: '',
        clientType: 'confidential',
        applicationType: 'web',
        redirectUris: [],
        postLogoutRedirectUris: [],
        scopes: ['victoria:write'],
      },
    });

    const list = html.slice(html.indexOf('data-scope-list'), html.indexOf('data-scope-select'));
    expect(list).toContain('<input type="hidden" name="scope" value="victoria:write"/>');
    expect(list).toContain('aria-label="Remove victoria:write"');
    expect(html).not.toContain('<option value="victoria:write">');
    expect(html).toContain('<option value="victoria:read">');
  });

  it('carries an inert template the script copies for each added scope', async () => {
    const html = await NewClientPage({ scopeChoices: CHOICES });

    const template = html.slice(
      html.indexOf('<template data-scope-template>'),
      html.indexOf('</template>'),
    );
    expect(template).toContain('data-scope-remove');
    expect(template).toContain('name="scope"');
  });

  it('escapes a hostile scope in the rows, the options and the dropdown', async () => {
    const html = await NewClientPage({
      scopeChoices: [HOSTILE, 'ok:read'],
      values: {
        clientId: '',
        name: '',
        clientType: 'confidential',
        applicationType: 'web',
        redirectUris: [],
        postLogoutRedirectUris: [],
        scopes: [HOSTILE],
      },
    });
    const withOption = await NewClientPage({ scopeChoices: [HOSTILE] });

    expect(html).not.toContain(HOSTILE);
    expect(withOption).not.toContain(HOSTILE);
  });

  it('puts the type first and groups the fields that belong to each type', async () => {
    const html = await NewClientPage({ scopeChoices: CHOICES });

    const typeAt = html.indexOf('name="clientType"');
    const publicAt = html.indexOf('class="only-public"');
    const confidentialAt = html.indexOf('class="only-confidential"');
    expect(typeAt).toBeGreaterThan(-1);
    expect(typeAt).toBeLessThan(html.indexOf('name="clientId"'));
    expect(publicAt).toBeLessThan(confidentialAt);

    const publicGroup = html.slice(publicAt, confidentialAt);
    const confidentialGroup = html.slice(confidentialAt, html.indexOf('Add client</button>'));
    expect(publicGroup).toContain('name="redirectUris"');
    expect(publicGroup).toContain('name="applicationType"');
    expect(publicGroup).not.toContain('name="scope"');
    expect(confidentialGroup).toContain('name="scope"');
    expect(confidentialGroup).not.toContain('name="redirectUris"');
  });

  it('shows the error and keeps typed values, escaped', async () => {
    const html = await NewClientPage({
      scopeChoices: CHOICES,
      error: HOSTILE,
      values: {
        clientId: 'x',
        name: HOSTILE,
        clientType: 'confidential',
        applicationType: 'native',
        redirectUris: [HOSTILE],
        postLogoutRedirectUris: [],
        scopes: ['victoria:write'],
      },
    });

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('role="alert"');
    expect(html).toMatch(/value="confidential"[^>]*checked/);
    expect(html).toContain('<input type="hidden" name="scope" value="victoria:write"/>');
  });
});

describe('ClientDetailPage', () => {
  it('lets an admin edit a public client and delete it, with no scopes', async () => {
    const html = await ClientDetailPage({
      client: makeClient({ client_name: HOSTILE, redirect_uris: [HOSTILE] }),
      grantableScopes: [],
      canManage: true,
    });

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('name="redirectUris"');
    expect(html).not.toContain('name="scope"');
    expect(html).not.toContain('Scopes (');
    expect(html).toContain('href="/admin/clients/my-app/delete"');
  });

  it('lists a confidential clients scopes with remove buttons, and leaves only its name to edit', async () => {
    const html = await ClientDetailPage({
      client: makeConfidentialClient({ scope: 'victoria:read victoria:write' }),
      grantableScopes: ['fife:read'],
      canManage: true,
    });

    expect(html).toContain('Scopes (2)');
    expect(html).toContain('action="/admin/clients/my-service/scopes/remove"');
    expect(html).toContain('aria-label="Remove victoria:write"');
    expect(html).toContain('/lasso/client/my-service-secret');
    expect(html).not.toContain('name="redirectUris"');
    expect(html).not.toMatch(/<input[^>]*type="checkbox"/);
  });

  it('offers only the scopes it can still be given', async () => {
    const html = await ClientDetailPage({
      client: makeConfidentialClient(),
      grantableScopes: ['victoria:write', 'fife:read'],
      canManage: true,
    });

    expect(html).toContain('action="/admin/clients/my-service/scopes"');
    expect(html).toContain('<option value="">Choose a scope…</option>');
    expect(html).toContain('<option value="fife:read">fife:read</option>');
    expect(html).not.toContain('<option value="victoria:read">');
  });

  it('says so when it already has every scope', async () => {
    const html = await ClientDetailPage({
      client: makeConfidentialClient(),
      grantableScopes: [],
      canManage: true,
    });

    expect(html).toContain('This client already has every scope.');
    expect(html).not.toContain('Choose a scope');
  });

  it('will not remove the last scope and says why', async () => {
    const html = await ClientDetailPage({
      client: makeConfidentialClient(),
      grantableScopes: [],
      canManage: true,
    });

    expect(html).toMatch(/<button[^>]*aria-label="Remove victoria:read"[^>]*disabled/);
    expect(html).toContain('A confidential client needs at least one scope');
  });

  it('keeps removal enabled while more than one scope is held', async () => {
    const html = await ClientDetailPage({
      client: makeConfidentialClient({ scope: 'victoria:read victoria:write' }),
      grantableScopes: [],
      canManage: true,
    });

    expect(html).not.toMatch(/<button[^>]*aria-label="Remove victoria:read"[^>]*disabled/);
  });

  it('escapes a hostile scope', async () => {
    const html = await ClientDetailPage({
      client: makeConfidentialClient({ scope: HOSTILE }),
      grantableScopes: [HOSTILE],
      canManage: true,
    });

    expect(html).not.toContain(HOSTILE);
  });

  it('hides everything editable for a client that can only be changed in code', async () => {
    const html = await ClientDetailPage({
      client: makeConfidentialClient(),
      grantableScopes: ['fife:read'],
      canManage: false,
    });

    expect(html).not.toContain('<form class="form-grid"');
    expect(html).not.toContain('Scopes (');
    expect(html).not.toContain('/delete');
  });

  it('reports a save and an error, keeping what was typed', async () => {
    const saved = await ClientDetailPage({
      client: makeClient(),
      grantableScopes: [],
      canManage: true,
      saved: true,
    });
    const failed = await ClientDetailPage({
      client: makeClient(),
      grantableScopes: [],
      canManage: true,
      error: 'Nope',
      values: { name: 'Typed', redirectUris: [], postLogoutRedirectUris: [] },
    });

    expect(saved).toContain('Saved.');
    expect(failed).toContain('role="alert"');
    expect(failed).toContain('value="Typed"');
  });
});

describe('ClientSecretPage', () => {
  it('shows the secret with a copy button and says it is shown once', async () => {
    const html = await ClientSecretPage({ client: makeConfidentialClient(), secret: 'abc-123' });

    expect(html).toContain('abc-123');
    expect(html).toContain('data-copy-target="client-secret"');
    expect(html).toContain('Shown once');
  });

  it('escapes hostile text', async () => {
    const html = await ClientSecretPage({
      client: makeConfidentialClient({ client_name: HOSTILE }),
      secret: HOSTILE,
    });

    expect(html).not.toContain(HOSTILE);
  });
});

describe('DeleteClientPage', () => {
  it('names the client, posts to its delete address and cancels back to it', async () => {
    const html = await DeleteClientPage({ client: makeClient({ client_name: HOSTILE }) });

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('action="/admin/clients/my-app/delete"');
    expect(html).toContain('href="/admin/clients/my-app"');
  });

  it('mentions the secret only for a service', async () => {
    const app = await DeleteClientPage({ client: makeClient() });
    const service = await DeleteClientPage({ client: makeConfidentialClient() });

    expect(app).not.toContain('Deletes its secret');
    expect(service).toContain('Deletes its secret');
  });
});
