import { describe, expect, it } from 'vitest';
import { ConfirmPage } from '#src/portal/admin/views/components/confirm-page.tsx';
import { makeUser } from '#test/support/users.ts';

const user = makeUser();

function render(overrides: Partial<Parameters<typeof ConfirmPage>[0]> = {}) {
  return ConfirmPage({
    title: 'Do it',
    heading: 'Do this?',
    user,
    action: '/admin/users/sub-1/do-it',
    submitLabel: 'Do it now',
    tone: 'danger',
    children: '<li>First</li><li>Second</li>',
    ...overrides,
  });
}

describe('ConfirmPage', () => {
  it('names who it affects', async () => {
    const html = await render();

    expect(html).toContain('<h2>Do this?</h2>');
    expect(html).toContain('Friend Person');
    expect(html).toContain('friend@example.com');
  });

  it('lists what happens, in the order given', async () => {
    const html = await render();

    expect(html).toContain('<ul class="consequences"><li>First</li><li>Second</li></ul>');
  });

  it('posts to its own address, submitted once', async () => {
    const html = await render();

    expect(html).toMatch(/<form[^>]*action="\/admin\/users\/sub-1\/do-it"[^>]*data-once/);
  });

  it.each(['danger', 'caution'] as const)('styles its button as %s', async (tone) => {
    expect(await render({ tone })).toContain(`class="row-action ${tone}"`);
  });

  it('offers a way back that changes nothing', async () => {
    expect(await render()).toContain('href="/admin/users/sub-1"');
  });

  it('escapes a hostile heading and button label', async () => {
    const hostile = '<img src=x onerror=alert(1)>';
    const html = await render({ heading: hostile, submitLabel: hostile });

    expect(html).not.toContain(hostile);
  });
});
