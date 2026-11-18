import { describe, expect, it } from 'vitest';
import { CopyButton, Help, Layout, List, Table, Time } from '#src/portal/views/layout.tsx';

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

describe('Table', () => {
  it('labels each cell with its column heading', () => {
    const html = Table({ columns: ['Name', 'ID'], rows: [['a', 'b']] }) as string;

    expect(html).toContain('<td role="cell" data-label="Name">a</td>');
    expect(html).toContain('<td role="cell" data-label="ID">b</td>');
  });

  it('leaves a cell unlabelled when its heading is blank', () => {
    const html = Table({ columns: ['Name', ''], rows: [['a', 'b']] }) as string;

    expect(html).toContain('<td role="cell">b</td>');
  });

  it('escapes a hostile heading in its cell label', () => {
    const html = Table({ columns: ['"><img src=x onerror=alert(1)>'], rows: [['a']] }) as string;

    expect(html).not.toContain('"><img');
  });

  it('keeps table semantics on the table and its rows', () => {
    const html = Table({ columns: ['Name'], rows: [['a']] }) as string;

    expect(html).toContain('<table role="table">');
    expect(html).toContain('<tr role="row">');
  });
});

describe('Layout submit-once script', () => {
  it('disables the submit buttons of forms marked data-once', async () => {
    const html = await Layout({ title: 't', active: '/', isAdmin: false, children: 'x' });

    expect(html).toContain('form[data-once]');
    expect(html).toContain('button.disabled = true');
  });
});

describe('CopyButton', () => {
  it('points at the element whose text it copies', () => {
    const html = CopyButton({ target: 'temp-password' }) as string;

    expect(html).toContain('data-copy-target="temp-password"');
    expect(html).toContain('aria-label="Copy"');
  });

  it('is wired up by the page script', async () => {
    const html = await Layout({ title: 't', active: '/', isAdmin: false, children: 'x' });

    expect(html).toContain('navigator.clipboard.writeText');
  });
});

describe('Help', () => {
  it('carries its text for the tooltip and for screen readers', () => {
    const html = Help({ text: 'Explains it' }) as string;

    expect(html).toContain('data-help="Explains it"');
    expect(html).toContain('aria-label="Explains it"');
  });
});

describe('portal layout escapes what it prints', () => {
  const HOSTILE = '<img src=x onerror=alert(1)>';

  it('escapes the page title', async () => {
    const html = await Layout({ title: HOSTILE, active: '/', isAdmin: false, children: 'x' });

    expect(html).not.toContain(HOSTILE);
  });

  it('escapes table headings', async () => {
    const html = await Table({ columns: [HOSTILE], rows: [] });

    expect(html).not.toContain(HOSTILE);
  });

  it.each([true, false])('escapes list items (mono: %s)', (mono) => {
    const html = List({ items: [HOSTILE], mono }) as string;

    expect(html).not.toContain(HOSTILE);
    expect(html).toContain('&lt;img');
  });
});
