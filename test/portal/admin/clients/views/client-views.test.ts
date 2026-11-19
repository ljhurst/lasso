import { describe, expect, it } from 'vitest';
import { ClientDetailPage } from '#src/portal/admin/clients/views/client-detail.tsx';
import { ClientSecretPage } from '#src/portal/admin/clients/views/client-secret.tsx';
import { DeleteClientPage } from '#src/portal/admin/clients/views/delete-client.tsx';
import { NewClientPage } from '#src/portal/admin/clients/views/new-client.tsx';
import { makeClient, makeMachineClient } from '#test/support/clients.ts';

const HOSTILE = '"><img src=x onerror=alert(1)>';
const CHOICES = ['victoria:read', 'victoria:write'];

describe('NewClientPage', () => {
  it('posts to the clients list, once, with every field', async () => {
    const html = await NewClientPage({ scopeChoices: CHOICES });

    expect(html).toMatch(/<form[^>]*action="\/admin\/clients"[^>]*data-once/);
    for (const name of ['clientId', 'name', 'kind', 'redirectUris', 'postLogoutRedirectUris']) {
      expect(html).toContain(`name="${name}"`);
    }
    expect(html).toContain('name="scope" value="victoria:read"');
  });

  it('shows the error and keeps typed values, escaped', async () => {
    const html = await NewClientPage({
      scopeChoices: CHOICES,
      error: HOSTILE,
      values: {
        clientId: 'x',
        name: HOSTILE,
        kind: 'service',
        applicationType: 'native',
        redirectUris: [HOSTILE],
        postLogoutRedirectUris: [],
        scopes: ['victoria:write'],
      },
    });

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('role="alert"');
    expect(html).toMatch(/value="service"[^>]*checked/);
    expect(html).toMatch(/name="scope" value="victoria:write" checked/);
  });
});

describe('ClientDetailPage', () => {
  it('lets an admin edit an app and delete it, without scopes', async () => {
    const html = await ClientDetailPage({
      client: makeClient({ name: HOSTILE, redirectUris: [HOSTILE] }),
      scopeChoices: CHOICES,
      canManage: true,
    });

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('name="redirectUris"');
    expect(html).not.toContain('name="scope"');
    expect(html).toContain('href="/admin/clients/my-app/delete"');
  });

  it('shows a service its scopes and secret parameter, never a secret', async () => {
    const html = await ClientDetailPage({
      client: makeMachineClient(),
      scopeChoices: CHOICES,
      canManage: true,
    });

    expect(html).toMatch(/name="scope" value="victoria:read" checked/);
    expect(html).toContain('/lasso/client/my-service-secret');
    expect(html).not.toContain('name="redirectUris"');
  });

  it('hides the form for a client that can only be changed in code', async () => {
    const html = await ClientDetailPage({
      client: makeClient(),
      scopeChoices: CHOICES,
      canManage: false,
    });

    expect(html).not.toContain('<form class="form-grid"');
    expect(html).not.toContain('/delete');
  });

  it('reports a save and an error', async () => {
    const saved = await ClientDetailPage({
      client: makeClient(),
      scopeChoices: CHOICES,
      canManage: true,
      saved: true,
    });
    const failed = await ClientDetailPage({
      client: makeClient(),
      scopeChoices: CHOICES,
      canManage: true,
      error: 'Nope',
    });

    expect(saved).toContain('Saved.');
    expect(failed).toContain('role="alert"');
  });
});

describe('ClientSecretPage', () => {
  it('shows the secret with a copy button and says it is shown once', async () => {
    const html = await ClientSecretPage({ client: makeMachineClient(), secret: 'abc-123' });

    expect(html).toContain('abc-123');
    expect(html).toContain('data-copy-target="client-secret"');
    expect(html).toContain('Shown once');
  });

  it('escapes hostile text', async () => {
    const html = await ClientSecretPage({
      client: makeMachineClient({ name: HOSTILE }),
      secret: HOSTILE,
    });

    expect(html).not.toContain(HOSTILE);
  });
});

describe('DeleteClientPage', () => {
  it('names the client, posts to its delete address and cancels back to it', async () => {
    const html = await DeleteClientPage({ client: makeClient({ name: HOSTILE }) });

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('action="/admin/clients/my-app/delete"');
    expect(html).toContain('href="/admin/clients/my-app"');
  });

  it('mentions the secret only for a service', async () => {
    const app = await DeleteClientPage({ client: makeClient() });
    const service = await DeleteClientPage({ client: makeMachineClient() });

    expect(app).not.toContain('Deletes its secret');
    expect(service).toContain('Deletes its secret');
  });
});
