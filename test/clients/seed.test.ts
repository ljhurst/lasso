import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toClientMetadata } from '#src/clients/metadata.ts';
import { seedClients } from '#src/clients/seed.ts';
import { validateClient } from '#src/clients/validate.ts';

vi.mock('#src/config/ssm.ts', () => ({ getParameter: vi.fn(async () => 'shared-secret') }));

const { buildClients } = await import('#src/config/clients.ts');

beforeEach(() => vi.clearAllMocks());

describe('seedClients', () => {
  it('serves exactly what the built-in client list serves', async () => {
    const builtIn = await buildClients();

    const seeded = seedClients.map((seed) =>
      toClientMetadata(
        { ...seed, createdAt: '2026-01-01T00:00:00.000Z' },
        seed.secretSsmParam ? 'shared-secret' : undefined,
      ),
    );

    expect(seeded).toEqual(builtIn);
  });

  it('only holds clients that pass validation', () => {
    for (const seed of seedClients) {
      const scopes = seed.scope?.split(' ') ?? [];
      expect(validateClient({ ...seed, createdAt: 'now' }, scopes)).toBeUndefined();
    }
  });
});
