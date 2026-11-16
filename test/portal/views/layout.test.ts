import { describe, expect, it } from 'vitest';
import { Layout, Time } from '#src/portal/views/layout.tsx';

describe('Time', () => {
  it('carries the exact time and a readable UTC fallback', () => {
    const html = Time({ seconds: 1_794_710_390 }) as string;

    expect(html).toContain('datetime="2026-11-15T02:39:50.000Z"');
    expect(html).toContain('title="2026-11-15T02:39:50.000Z"');
    expect(html).toContain('Nov 15, 2026, 2:39 AM UTC');
  });

  it('shows a dash when there is no time', () => {
    const html = Time({ seconds: undefined }) as string;

    expect(html).toContain('—');
    expect(html).not.toContain('<time');
  });
});

describe('Layout', () => {
  it('includes the script that shows times in the viewer’s zone', async () => {
    const html = await Layout({ title: 't', active: '/', isAdmin: false, children: 'x' });

    expect(html).toContain("querySelectorAll('time[datetime]')");
  });
});
