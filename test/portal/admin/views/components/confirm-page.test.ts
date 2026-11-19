import { describe, expect, it } from 'vitest';
import { ConfirmPage } from '#src/portal/admin/views/components/confirm-page.tsx';

function render(overrides: Partial<Parameters<typeof ConfirmPage>[0]> = {}) {
  return ConfirmPage({
    title: 'Do it',
    heading: 'Do this?',
    section: 'clients',
    crumbs: [{ label: 'The thing', href: '/admin/clients/thing' }],
    facts: '<dl>The facts</dl>',
    action: '/admin/clients/thing/do-it',
    cancelHref: '/admin/clients/thing',
    submitLabel: 'Do it now',
    tone: 'danger',
    children: '<li>First</li><li>Second</li>',
    ...overrides,
  });
}

describe('ConfirmPage', () => {
  it('shows what it affects under its heading', async () => {
    const html = await render();

    expect(html).toContain('<h2>Do this?</h2>');
    expect(html).toContain('<dl>The facts</dl>');
  });

  it('shows an error as an alert only when given one', async () => {
    const hostile = '<img src=x onerror=alert(1)>';

    expect(await render({ error: hostile })).toContain('role="alert"');
    expect(await render({ error: hostile })).not.toContain(hostile);
    expect(await render()).not.toContain('role="alert"');
  });

  it('lists what happens, in the order given', async () => {
    const html = await render();

    expect(html).toContain('<ul class="consequences"><li>First</li><li>Second</li></ul>');
  });

  it('posts to its own address, submitted once', async () => {
    const html = await render();

    expect(html).toMatch(/<form[^>]*action="\/admin\/clients\/thing\/do-it"[^>]*data-once/);
  });

  it.each(['danger', 'caution'] as const)('styles its button as %s', async (tone) => {
    expect(await render({ tone })).toContain(`class="row-action ${tone}"`);
  });

  it('offers a way back that changes nothing', async () => {
    expect(await render()).toContain('href="/admin/clients/thing"');
  });

  it('escapes a hostile heading and button label', async () => {
    const hostile = '<img src=x onerror=alert(1)>';
    const html = await render({ heading: hostile, submitLabel: hostile });

    expect(html).not.toContain(hostile);
  });

  it("links back up through its section's list page to the thing", async () => {
    const html = await render();

    expect(html).toContain('<li><a href="/admin">Clients &amp; resources</a></li>');
    expect(html).toContain('<li><a href="/admin/clients/thing">The thing</a></li>');
    expect(html).not.toContain('aria-current');
  });

  it('roots a users page at the users list', async () => {
    expect(await render({ section: 'users' })).toContain(
      '<li><a href="/admin/users">Users</a></li>',
    );
  });
});
