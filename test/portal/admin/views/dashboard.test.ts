import { describe, expect, it } from 'vitest';
import { DashboardPage } from '#src/portal/admin/views/dashboard.tsx';
import type { Resource } from '#src/resources/types.ts';
import { makeClient } from '#test/support/clients.ts';

const RESOURCES: Resource[] = [
  {
    indicator: 'https://api.example.com/',
    name: 'Example API',
    scopes: ['example:read', 'example:write'],
    builtIn: false,
  },
];

describe('admin DashboardPage', () => {
  it('labels the client and resource cells with their column headings', async () => {
    const html = await DashboardPage({ clients: [makeClient()], resources: RESOURCES });
    const labels = new Set([...html.matchAll(/data-label="([^"]+)"/g)].map((match) => match[1]));

    expect(labels).toEqual(
      new Set([
        'Name',
        'Client ID',
        'Type',
        'Redirect URIs',
        'Grant types',
        'Resource indicator',
        'Scope',
        'Access token format',
      ]),
    );
  });

  it('links each client to its page and offers to add one', async () => {
    const html = await DashboardPage({
      clients: [makeClient({ client_id: 'my-app' })],
      resources: RESOURCES,
    });

    expect(html).toContain('href="/admin/clients/my-app"');
    expect(html).toContain('href="/admin/clients/new"');
  });

  it('links each resource to its page and offers to add one', async () => {
    const html = await DashboardPage({ clients: [], resources: RESOURCES });

    expect(html).toContain('href="/admin/resources/aHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20v"');
    expect(html).toContain('href="/admin/resources/new"');
  });

  it('shows redirect URIs and scopes in sorted order, whatever order they were stored in', async () => {
    const html = await DashboardPage({
      clients: [
        makeClient({
          redirect_uris: [
            'https://z.example.com/cb',
            'http://localhost:4321/cb',
            'https://a.example.com/cb',
          ],
        }),
      ],
      resources: [
        {
          indicator: 'https://api.example.com/',
          name: 'Example API',
          scopes: ['example:write', 'example:admin', 'example:read'],
          builtIn: false,
        },
      ],
    });

    const order = (items: string[]) => items.map((item) => html.indexOf(item));
    const uris = order([
      'http://localhost:4321/cb',
      'https://a.example.com/cb',
      'https://z.example.com/cb',
    ]);
    const scopes = order(['example:admin', 'example:read', 'example:write']);
    expect(uris).toEqual([...uris].sort((a, b) => a - b));
    expect(scopes).toEqual([...scopes].sort((a, b) => a - b));
    expect(Math.min(...uris)).toBeGreaterThan(-1);
  });

  it('says so when no clients are registered', async () => {
    expect(await DashboardPage({ clients: [], resources: RESOURCES })).toContain(
      'No clients registered.',
    );
  });

  it('escapes a hostile client name', async () => {
    const hostile = '<img src=x onerror=alert(1)>';
    const html = await DashboardPage({
      clients: [makeClient({ client_name: hostile })],
      resources: RESOURCES,
    });

    expect(html).not.toContain(hostile);
  });
});
