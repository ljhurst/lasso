import { describe, expect, it } from 'vitest';
import { Help } from '#src/portal/views/components/help.tsx';

describe('Help', () => {
  it('carries its text for the tooltip and for screen readers', () => {
    const html = Help({ text: 'Explains it' }) as string;

    expect(html).toContain('data-help="Explains it"');
    expect(html).toContain('aria-label="Explains it"');
  });
});
