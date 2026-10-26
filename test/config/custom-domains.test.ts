import { describe, expect, it, vi } from 'vitest';

import { buildClients } from '#src/config/clients.ts';
import { getResourceServerInfo, resources } from '#src/config/resources.ts';

vi.mock('#src/config/ssm.ts', () => ({
  getParameter: vi.fn().mockResolvedValue('client-secret'),
}));

const lambdaUrl = (name: string) =>
  Object.keys(resources).find(
    (indicator) => indicator.includes('.lambda-url.') && resources[indicator]?.name === name,
  );

describe('custom domain resources', () => {
  it.each([
    ['https://porto.bylukehurst.com/', 'Porto'],
    ['https://victoria-viewer.bylukehurst.com/', 'Victoria Viewer'],
  ])('accepts %s with the same scopes as the Lambda URL', (alias, name) => {
    const original = lambdaUrl(name);

    expect(original).toBeDefined();
    expect(getResourceServerInfo(alias)).toMatchObject({
      name,
      scope: resources[original as string]?.scope,
      accessTokenFormat: 'jwt',
    });
  });

  it('serves Victoria under its custom domain with its scopes and portal link', () => {
    const indicator = 'https://victoria-mcp.bylukehurst.com/';

    expect(getResourceServerInfo(indicator)).toMatchObject({
      name: 'Victoria',
      scope: 'victoria:read victoria:write',
      accessTokenFormat: 'jwt',
      app: { url: indicator },
    });
  });

  it('no longer accepts the retired Victoria Function URL', () => {
    expect(() =>
      getResourceServerInfo(
        'https://diozeathy56roah5fxesmhji640ugrkn.lambda-url.us-east-1.on.aws/',
      ),
    ).toThrow('unknown resource indicator');
  });

  it('keeps the Lambda URLs working', () => {
    expect(resources[lambdaUrl('Porto') as string]?.name).toBe('Porto');
  });

  it.each(['https://porto.bylukehurst.com/', 'https://victoria-viewer.bylukehurst.com/'])(
    'does not list the alias %s as a separate app',
    (alias) => {
      expect(resources[alias]).toBeDefined();
      expect(resources[alias]?.app).toBeUndefined();
    },
  );

  it('still rejects an unknown resource', () => {
    expect(() => getResourceServerInfo('https://unknown.example.com/')).toThrow(
      'unknown resource indicator',
    );
  });
});

describe('victoria-viewer client', () => {
  it('accepts the custom domain callbacks alongside the Lambda URL ones', async () => {
    const clients = await buildClients();
    const viewer = clients.find((client) => client.client_id === 'victoria-viewer');

    expect(viewer?.redirect_uris).toContain(
      'https://victoria-viewer.bylukehurst.com/auth/callback',
    );
    expect(viewer?.post_logout_redirect_uris).toContain(
      'https://victoria-viewer.bylukehurst.com/logged-out',
    );
    expect(viewer?.redirect_uris?.some((uri) => uri.includes('.lambda-url.'))).toBe(true);
  });
});
