import { describe, expect, it } from 'vitest';
import { Layout, List, Table, Time } from '#src/portal/views/layout.tsx';

describe('Time', () => {
  it('carries the exact time and a readable UTC fallback', () => {
    const html = Time({ seconds: 1_794_710_390 }) as string;

    expect(html).toContain('datetime="2026-11-15T02:39:50.000Z"');
    expect(html).toContain('title="2026-11-15T02:39:50.000Z"');
    expect(html).toContain('Nov 15, 2026, 2:39 AM UTC');
  });

  it('shows a dash when there is no time', () => {
    const html = Time({ seconds: undefined }) as string;

    expect(html).toContain('—');
    expect(html).not.toContain('<time');
  });
});

describe('Layout', () => {
  it('includes the script that shows times in the viewer’s zone', async () => {
    const html = await Layout({ title: 't', active: '/', isAdmin: false, children: 'x' });

    expect(html).toContain("querySelectorAll('time[datetime]')");
  });
});

describe('portal layout escapes what it prints', () => {
  const HOSTILE = '<img src=x onerror=alert(1)>';

  it('escapes the page title', async () => {
    const html = await Layout({ title: HOSTILE, active: '/', isAdmin: false, children: 'x' });

    expect(html).not.toContain(HOSTILE);
  });

  it('escapes table headings', async () => {
    const html = await Table({ columns: [HOSTILE], children: '' });

    expect(html).not.toContain(HOSTILE);
  });

  it.each([true, false])('escapes list items (mono: %s)', (mono) => {
    const html = List({ items: [HOSTILE], mono }) as string;

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('&lt;img');
  });
});
