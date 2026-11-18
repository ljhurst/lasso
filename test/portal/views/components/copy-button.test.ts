import { describe, expect, it } from 'vitest';
import { CopyButton } from '#src/portal/views/components/copy-button.tsx';

describe('CopyButton', () => {
  it('points at the element whose text it copies', () => {
    const html = CopyButton({ target: 'temp-password' }) as string;

    expect(html).toContain('data-copy-target="temp-password"');
    expect(html).toContain('aria-label="Copy"');
    expect(html).toContain('class="icon-button"');
  });
});
