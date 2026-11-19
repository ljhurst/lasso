import { describe, expect, it } from 'vitest';
import { DashboardPage } from '#src/portal/admin/views/dashboard.tsx';
import { makeClient } from '#test/support/clients.ts';

describe('admin DashboardPage', () => {
  it('labels the client and resource cells with their column headings', async () => {
    const html = await DashboardPage({ clients: [makeClient()] });
    const labels = new Set([...html.matchAll(/data-label="([^"]+)"/g)].map((match) => match[1]));

    expect(labels).toEqual(
      new Set([
        'Name',
        'Client ID',
        'Redirect URIs',
        'Grant types',
        'Resource indicator',
        'Scope',
        'Access token format',
      ]),
    );
  });

  it('links each client to its page and offers to add one', async () => {
    const html = await DashboardPage({ clients: [makeClient({ clientId: 'my-app' })] });

    expect(html).toContain('href="/admin/clients/my-app"');
    expect(html).toContain('href="/admin/clients/new"');
  });

  it('says so when no clients are registered', async () => {
    expect(await DashboardPage({ clients: [] })).toContain('No clients registered.');
  });

  it('escapes a hostile client name', async () => {
    const hostile = '<img src=x onerror=alert(1)>';
    const html = await DashboardPage({ clients: [makeClient({ name: hostile })] });

    expect(html).not.toContain(hostile);
  });
});
