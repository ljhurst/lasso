import { describe, expect, it } from 'vitest';
import { DeleteResourcePage } from '#src/portal/admin/resources/views/delete-resource.tsx';
import { NewResourcePage } from '#src/portal/admin/resources/views/new-resource.tsx';
import { ResourceDetailPage } from '#src/portal/admin/resources/views/resource-detail.tsx';
import { resourceId } from '#src/resources/id.ts';
import type { Resource } from '#src/resources/types.ts';

const HOSTILE = '"><img src=x onerror=alert(1)>';

const resource: Resource = {
  indicator: 'https://api.example.com/',
  name: 'Example API',
  scopes: ['example:read', 'example:write'],
  app: { type: 'mcp', url: 'https://api.example.com/mcp' },
  builtIn: false,
};

describe('NewResourcePage', () => {
  it('posts to the resources list, once, with every field', async () => {
    const html = await NewResourcePage({});

    expect(html).toMatch(/<form[^>]*action="\/admin\/resources"[^>]*data-once/);
    for (const name of ['resource', 'name', 'scopes', 'appType', 'appUrl']) {
      expect(html).toContain(`name="${name}"`);
    }
  });

  it('offers each way an app can appear, with none first', async () => {
    const html = await NewResourcePage({});

    expect(html).toContain('<option value="" selected>Not shown</option>');
    for (const label of ['Web app', 'MCP server', 'API']) {
      expect(html).toContain(label);
    }
  });

  it('shows the error and keeps typed values, escaped', async () => {
    const html = await NewResourcePage({
      error: HOSTILE,
      values: {
        resource: HOSTILE,
        name: HOSTILE,
        scopes: [HOSTILE, 'ok:read'],
        appType: 'mcp',
        appUrl: HOSTILE,
      },
    });

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('role="alert"');
    expect(html).toMatch(/<option value="mcp" selected>/);
  });
});

describe('ResourceDetailPage', () => {
  const id = resourceId(resource.indicator);

  it('shows a stored resource with its form, scopes and a way to delete it', async () => {
    const html = await ResourceDetailPage({ resource, createdAt: '2026-01-01T00:00:00.000Z' });

    expect(html).toContain(`action="/admin/resources/${id}"`);
    expect(html).toContain(`href="/admin/resources/${id}/delete"`);
    expect(html).toContain('example:write');
    expect(html).toContain('Created');
    expect(html).toMatch(/<option value="mcp" selected>/);
  });

  it('lists the scopes once, in the form, not also in the facts above it', async () => {
    const html = await ResourceDetailPage({ resource });

    expect(html.split('example:write').length - 1).toBe(1);
    expect(html).toContain('<textarea');
  });

  it('lists the scopes of a built-in resource in the facts, since it has no form', async () => {
    const html = await ResourceDetailPage({ resource: { ...resource, builtIn: true } });

    expect(html).toContain('example:write');
    expect(html).not.toContain('<textarea');
  });

  it('fills the form from the resource, and from what was typed after an error', async () => {
    const fresh = await ResourceDetailPage({ resource });
    const failed = await ResourceDetailPage({
      resource,
      error: 'Nope',
      values: { name: 'Typed', scopes: ['typed:read'], appType: undefined, appUrl: '' },
    });

    expect(fresh).toContain('value="Example API"');
    expect(failed).toContain('value="Typed"');
    expect(failed).toContain('typed:read');
    expect(failed).toContain('role="alert"');
  });

  it('says so after a save', async () => {
    expect(await ResourceDetailPage({ resource, saved: true })).toContain('Saved.');
  });

  it('offers no form or delete for a resource Lasso serves itself', async () => {
    const html = await ResourceDetailPage({ resource: { ...resource, builtIn: true } });

    expect(html).toContain('can only be changed in code');
    expect(html).not.toContain('<form class="form-grid"');
    expect(html).not.toContain('/delete');
  });

  it('escapes hostile text everywhere it appears', async () => {
    const html = await ResourceDetailPage({
      resource: {
        indicator: HOSTILE,
        name: HOSTILE,
        scopes: [HOSTILE],
        app: { type: 'web', url: HOSTILE },
        builtIn: false,
      },
    });

    expect(html).not.toContain(HOSTILE);
  });
});

describe('DeleteResourcePage', () => {
  it('names the resource, posts to its delete address and cancels back to it', async () => {
    const id = resourceId(resource.indicator);
    const html = await DeleteResourcePage({ resource });

    expect(html).toContain(`action="/admin/resources/${id}/delete"`);
    expect(html).toContain(`href="/admin/resources/${id}"`);
    expect(html).toContain('Ends the grants that reach it');
  });

  it('shows a refusal as an alert and escapes hostile text', async () => {
    const html = await DeleteResourcePage({
      resource: { ...resource, name: HOSTILE },
      error: HOSTILE,
    });

    expect(html).toContain('role="alert"');
    expect(html).not.toContain(HOSTILE);
  });
});
