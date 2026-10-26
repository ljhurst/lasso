import { describe, expect, it, vi } from 'vitest';

import { buildClients } from '#src/config/clients.ts';
import { allResourceScopes, getResourceServerInfo } from '#src/config/resources.ts';
import { getUserApps } from '#src/portal/apps/routes.ts';

vi.mock('#src/config/ssm.ts', () => ({
  getParameter: vi.fn().mockResolvedValue('client-secret'),
}));

const PORTO = 'https://porto.bylukehurst.com/';

describe('custom domain resources', () => {
  it.each([
    [PORTO, 'Porto', 'porto:read porto:write', `${PORTO}mcp`],
    [
      'https://victoria-mcp.bylukehurst.com/',
      'Victoria',
      'victoria:read victoria:write',
      'https://victoria-mcp.bylukehurst.com/mcp',
    ],
    [
      'https://victoria-viewer.bylukehurst.com/',
      'Victoria Viewer',
      'victoria:read',
      'https://victoria-viewer.bylukehurst.com/',
    ],
  ])(
    'serves %s with its scopes and a portal link to the endpoint',
    (indicator, name, scope, url) => {
      expect(getResourceServerInfo(indicator)).toMatchObject({
        name,
        scope,
        accessTokenFormat: 'jwt',
        app: { url },
      });
    },
  );

  it.each([
    'https://dpuc6r44q5s4rn2kj24rmgrxga0uxwgr.lambda-url.us-east-1.on.aws/',
    'https://diozeathy56roah5fxesmhji640ugrkn.lambda-url.us-east-1.on.aws/',
    'https://s4wndhtrbjoflmoqeb4zvvmeim0cyodv.lambda-url.us-east-1.on.aws/',
  ])('no longer accepts the retired Function URL %s', (indicator) => {
    expect(() => getResourceServerInfo(indicator)).toThrow('unknown resource indicator');
  });

  it('still rejects an unknown resource', () => {
    expect(() => getResourceServerInfo('https://unknown.example.com/')).toThrow(
      'unknown resource indicator',
    );
  });
});

describe('portal listings', () => {
  it('lists each app once', () => {
    const names = getUserApps([...allResourceScopes]).map((app) => app.resource.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('links porto to its MCP endpoint, not its resource indicator', () => {
    const porto = getUserApps([...allResourceScopes]).find((app) => app.indicator === PORTO);

    expect(porto?.resource.app?.url).toBe(`${PORTO}mcp`);
  });
});

describe('victoria-viewer client', () => {
  it('uses the custom domain callbacks and no Lambda URL ones', async () => {
    const clients = await buildClients();
    const viewer = clients.find((client) => client.client_id === 'victoria-viewer');

    expect(viewer?.redirect_uris).toContain(
      'https://victoria-viewer.bylukehurst.com/auth/callback',
    );
    expect(viewer?.post_logout_redirect_uris).toContain(
      'https://victoria-viewer.bylukehurst.com/logged-out',
    );
    for (const uri of [
      ...(viewer?.redirect_uris ?? []),
      ...(viewer?.post_logout_redirect_uris ?? []),
    ]) {
      expect(uri).not.toContain('.lambda-url.');
    }
  });
});
