import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from '#src/portal/views/components/breadcrumbs.tsx';

const HOSTILE = '<img src=x onerror=alert(1)>';

describe('Breadcrumbs', () => {
  it('is a labelled navigation landmark holding an ordered list', () => {
    const html = Breadcrumbs({ items: [{ label: 'Users', href: '/admin/users' }] }) as string;

    expect(html).toContain('<nav class="breadcrumbs" aria-label="Breadcrumb">');
    expect(html).toContain('<ol>');
  });

  it('links every page above the current one', () => {
    const html = Breadcrumbs({
      items: [
        { label: 'Users', href: '/admin/users' },
        { label: 'Friend Person', href: '/admin/users/sub-1' },
      ],
    }) as string;

    expect(html).toContain('<li><a href="/admin/users">Users</a></li>');
    expect(html).toContain('<li><a href="/admin/users/sub-1">Friend Person</a></li>');
  });

  it('does not repeat the current page, which the heading already names', () => {
    const html = Breadcrumbs({ items: [{ label: 'Users', href: '/admin/users' }] }) as string;

    expect(html).not.toContain('aria-current');
    expect(html.match(/<li>/g)).toHaveLength(1);
  });

  it('keeps the order it was given', () => {
    const html = Breadcrumbs({
      items: [
        { label: 'One', href: '/1' },
        { label: 'Two', href: '/2' },
        { label: 'Three', href: '/3' },
      ],
    }) as string;

    expect(html.indexOf('One')).toBeLessThan(html.indexOf('Two'));
    expect(html.indexOf('Two')).toBeLessThan(html.indexOf('Three'));
  });

  it('escapes a hostile label', () => {
    const html = Breadcrumbs({ items: [{ label: HOSTILE, href: '/x' }] }) as string;

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('&lt;img');
  });
});
