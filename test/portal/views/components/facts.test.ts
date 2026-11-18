import { describe, expect, it } from 'vitest';
import { Facts } from '#src/portal/views/components/facts.tsx';

describe('Facts', () => {
  it('pairs each label with its value', () => {
    const html = Facts({ items: [{ label: 'Email', value: 'a@example.com' }] }) as string;

    expect(html).toContain('<dt>Email</dt><dd>a@example.com</dd>');
  });

  it('escapes a hostile label', () => {
    const html = Facts({ items: [{ label: '<img src=x>', value: 'v' }] }) as string;

    expect(html).not.toContain('<img src=x>');
  });
});
