import { describe, expect, it } from 'vitest';
import { List } from '#src/portal/views/components/list.tsx';

const HOSTILE = '<img src=x onerror=alert(1)>';

describe('List', () => {
  it.each([true, false])('escapes list items (mono: %s)', (mono) => {
    const html = List({ items: [HOSTILE], mono }) as string;

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('&lt;img');
  });

  it('shows a dash when there is nothing to list', () => {
    expect(List({ items: [] }) as string).toContain('empty-cell');
  });

  it('wraps each item in code when asked', () => {
    expect(List({ items: ['a'], mono: true }) as string).toContain('<li><code>a</code></li>');
  });
});
