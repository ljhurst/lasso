import { describe, expect, it } from 'vitest';
import { Table } from '#src/portal/views/components/table.tsx';

const HOSTILE = '<img src=x onerror=alert(1)>';

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

  it('escapes table headings', () => {
    const html = Table({ columns: [HOSTILE], rows: [] }) as string;

    expect(html).not.toContain(HOSTILE);
  });

  it('keeps table semantics on the table and its rows', () => {
    const html = Table({ columns: ['Name'], rows: [['a']] }) as string;

    expect(html).toContain('<table role="table">');
    expect(html).toContain('<tr role="row">');
  });
});
