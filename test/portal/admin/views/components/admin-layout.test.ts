import { describe, expect, it } from 'vitest';
import { AdminLayout } from '#src/portal/admin/views/components/admin-layout.tsx';

function render(props: Partial<Parameters<typeof AdminLayout>[0]> = {}) {
  return AdminLayout({ section: 'users', title: 'A page', children: '<p>body</p>', ...props });
}

describe('AdminLayout', () => {
  it('shows the admin navigation with its own section marked', async () => {
    const users = await render({ section: 'users' });
    const clients = await render({ section: 'clients' });

    expect(users).toContain('<a href="/admin/users" class="active">Users</a>');
    expect(clients).toContain('<a href="/admin" class="active">Clients &amp; resources</a>');
    expect(users).toContain('<p>body</p>');
  });

  it("puts the section's list page at the root of the breadcrumbs", async () => {
    const html = await render({ section: 'users' });

    expect(html).toContain('<li><a href="/admin/users">Users</a></li>');
  });

  it('adds the pages between the root and this one', async () => {
    const html = await render({ crumbs: [{ label: 'Someone', href: '/admin/users/x' }] });

    expect(html.indexOf('>Users</a>')).toBeLessThan(html.indexOf('>Someone</a>'));
  });

  it("shows no breadcrumbs on a section's own list page", async () => {
    expect(await render({ index: true })).not.toContain('class="breadcrumbs"');
  });

  it('titles the document', async () => {
    expect(await render({ title: 'Hello' })).toContain('<title>Lasso — Hello</title>');
  });
});
