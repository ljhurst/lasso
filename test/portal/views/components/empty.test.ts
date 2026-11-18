import { describe, expect, it } from 'vitest';
import { Empty } from '#src/portal/views/components/empty.tsx';

describe('Empty', () => {
  it('shows its message in the muted style', () => {
    expect(Empty({ children: 'Nothing here' }) as string).toContain(
      '<p class="empty">Nothing here</p>',
    );
  });
});
