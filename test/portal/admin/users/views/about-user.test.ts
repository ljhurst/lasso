import { describe, expect, it } from 'vitest';
import { aboutUser } from '#src/portal/admin/users/views/about-user.tsx';
import { makeUser } from '#test/support/users.ts';

describe('aboutUser', () => {
  const props = aboutUser(makeUser());

  it('puts the page in the users section under the person', () => {
    expect(props.section).toBe('users');
    expect(props.crumbs).toEqual([{ label: 'Friend Person', href: '/admin/users/sub-1' }]);
  });

  it('cancels back to the person and shows who it affects', async () => {
    expect(props.cancelHref).toBe('/admin/users/sub-1');
    const facts = await props.facts;

    expect(facts).toContain('Friend Person');
    expect(facts).toContain('friend@example.com');
  });
});
