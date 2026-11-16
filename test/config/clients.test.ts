import { describe, expect, it, vi } from 'vitest';
import { clientNames } from '#src/config/clients.ts';

vi.mock('#src/config/ssm.ts', () => ({ getParameter: vi.fn(async () => 'secret') }));

describe('clientNames', () => {
  it('maps each client id to its display name', async () => {
    const names = await clientNames();

    expect(names.freal).toBe('Freal');
    expect(names['lasso-portal']).toBe('Lasso Portal');
  });

  it('never exposes a client secret', async () => {
    const names = await clientNames();

    expect(JSON.stringify(names)).not.toContain('secret');
  });
});
