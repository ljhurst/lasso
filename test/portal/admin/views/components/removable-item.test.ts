import { describe, expect, it } from 'vitest';
import { RemovableItem } from '#src/portal/admin/views/components/removable-item.tsx';

describe('RemovableItem', () => {
  it('posts the value to its action from a button that says what it removes', async () => {
    const html = await RemovableItem({ label: 'fife:read', action: '/x/remove', field: 'role' });

    expect(html).toContain('<form method="post" action="/x/remove">');
    expect(html).toContain('<input type="hidden" name="role" value="fife:read"/>');
    expect(html).toContain('aria-label="Remove fife:read"');
    expect(html).not.toContain('disabled');
  });

  it('disables the button and shows each note', async () => {
    const html = await RemovableItem({
      label: 'a',
      action: '/x',
      field: 'scope',
      notes: ['first', 'second'],
      blocked: true,
    });

    expect(html).toMatch(/<button[^>]*disabled/);
    expect(html).toContain('<span class="note">first</span>');
    expect(html).toContain('<span class="note">second</span>');
  });

  it('escapes hostile text', async () => {
    const hostile = '"><img src=x onerror=alert(1)>';
    const html = await RemovableItem({
      label: hostile,
      action: '/x',
      field: 'f',
      notes: [hostile],
    });

    expect(html).not.toContain(hostile);
  });
});
