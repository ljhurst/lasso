import { describe, expect, it } from 'vitest';
import { Layout } from '#src/portal/views/layout.tsx';

const HOSTILE = '<img src=x onerror=alert(1)>';

function render(overrides: Partial<Parameters<typeof Layout>[0]> = {}) {
  return Layout({ title: 't', active: '/', isAdmin: false, children: 'x', ...overrides });
}

describe('Layout document', () => {
  it('starts with a doctype so browsers do not use quirks mode', async () => {
    expect(await render()).toMatch(/^<!doctype html><html/);
  });
});

describe('Layout header', () => {
  it('links the logo to the apps page', async () => {
    expect(await render()).toContain('<a class="home" href="/apps">');
  });

  it('shows no navigation to someone with only one place to go', async () => {
    expect(await render({ isAdmin: false })).not.toContain('<nav>');
  });

  it('shows the navigation to an admin', async () => {
    expect(await render({ isAdmin: true })).toContain('<nav><a href="/apps"');
  });
});

describe('Layout breadcrumbs', () => {
  const crumbs = [{ label: 'Users', href: '/admin/users' }];

  it('puts the trail above the page content', async () => {
    const html = await render({ crumbs, children: 'PAGE-CONTENT' });

    expect(html.indexOf('aria-label="Breadcrumb"')).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="Breadcrumb"')).toBeLessThan(html.indexOf('PAGE-CONTENT'));
  });

  it('shows no trail when none is given', async () => {
    expect(await render()).not.toContain('aria-label="Breadcrumb"');
  });
});

describe('Layout stylesheet', () => {
  it('inlines the portal stylesheet', async () => {
    const html = await render();

    expect(html).toContain('.shell {');
    expect(html).toContain('@media (max-width: 640px)');
  });
});

describe('Layout page scripts', () => {
  it('includes the script that shows times in the viewer’s zone', async () => {
    expect(await render()).toContain("querySelectorAll('time[datetime]')");
  });

  it('wires up copy buttons', async () => {
    expect(await render()).toContain('navigator.clipboard.writeText');
  });

  it('disables the submit buttons of forms marked data-once', async () => {
    const html = await render();

    expect(html).toContain('form[data-once]');
    expect(html).toContain('button.disabled = true');
  });
});

describe('Layout navigation', () => {
  it('shows the admin links only to admins', async () => {
    expect(await render({ isAdmin: true })).toContain('href="/admin/users"');
    expect(await render({ isAdmin: false })).not.toContain('href="/admin/users"');
  });

  it('marks the current page', async () => {
    const html = await render({ active: '/apps', isAdmin: true });

    expect(html).toContain('<a href="/apps" class="active">');
    expect(html).not.toContain('<a href="/admin/users" class="active">');
  });
});

describe('Layout escaping', () => {
  it('escapes the page title', async () => {
    expect(await render({ title: HOSTILE })).not.toContain(HOSTILE);
  });
});
