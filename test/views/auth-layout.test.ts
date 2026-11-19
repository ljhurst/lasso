import { describe, expect, it } from 'vitest';
import { AuthLayout } from '#src/views/auth-layout.tsx';

describe('AuthLayout', () => {
  it('starts with a doctype so browsers do not use quirks mode', async () => {
    const html = await AuthLayout({ title: 't', heading: 'h', children: 'x' });

    expect(html).toMatch(/^<!doctype html><html/);
  });
});
