import { describe, expect, it } from 'vitest';
import { AppType } from '#src/resources/types.ts';
import { DashboardPage } from '#src/portal/apps/views/dashboard.tsx';

const HOSTILE = '<img src=x onerror=alert(1)>';

describe('apps DashboardPage', () => {
  it.each([
    ['web app', { type: AppType.Web, url: 'https://app.example.com/' }],
    ['MCP app', { type: AppType.Mcp, url: 'https://app.example.com/mcp' }],
  ])('escapes a hostile resource name on a %s tile', async (_name, app) => {
    const html = await DashboardPage({
      isAdmin: false,
      apps: [
        {
          indicator: 'https://app.example.com/',
          resource: {
            indicator: 'https://app.example.com/',
            name: HOSTILE,
            scopes: [],
            app,
            builtIn: false,
          },
        },
      ],
    });

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('&lt;img');
  });
});
