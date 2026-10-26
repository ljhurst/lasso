import { describe, expect, it } from 'vitest';
import { clientIp } from '#src/auth/client-ip.ts';

function contextWith(headers: Record<string, string>) {
  return { get: (name: string) => headers[name.toLowerCase()] ?? '' } as never;
}

describe('clientIp', () => {
  it('reads the source IP from the adapter request context', () => {
    const ctx = contextWith({
      'x-amzn-request-context': JSON.stringify({ http: { sourceIp: '203.0.113.7' } }),
    });
    expect(clientIp(ctx)).toBe('203.0.113.7');
  });

  it('ignores X-Forwarded-For', () => {
    const ctx = contextWith({ 'x-forwarded-for': '198.51.100.1, 203.0.113.7' });
    expect(clientIp(ctx)).toBe('unknown');
  });

  it('prefers the request context over a forged X-Forwarded-For', () => {
    const ctx = contextWith({
      'x-forwarded-for': '198.51.100.1',
      'x-amzn-request-context': JSON.stringify({ http: { sourceIp: '203.0.113.7' } }),
    });
    expect(clientIp(ctx)).toBe('203.0.113.7');
  });

  it.each([
    ['missing', undefined],
    ['not JSON', 'not json'],
    ['no http block', JSON.stringify({ other: 1 })],
    ['a non-string source IP', JSON.stringify({ http: { sourceIp: 42 } })],
    ['an empty source IP', JSON.stringify({ http: { sourceIp: '' } })],
  ])('returns unknown when the request context is %s', (_name, value) => {
    const ctx = contextWith(value === undefined ? {} : { 'x-amzn-request-context': value });
    expect(clientIp(ctx)).toBe('unknown');
  });
});
