import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '#src/portal/admin/views/dashboard.tsx';

vi.mock('#src/config/ssm.ts', () => ({ getParameter: vi.fn(async () => 'secret') }));

describe('admin DashboardPage', () => {
  it('labels the client and resource cells with their column headings', async () => {
    const html = await DashboardPage();
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
});
