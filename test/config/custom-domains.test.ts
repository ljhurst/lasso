import { describe, expect, it } from 'vitest';

import { allResourceScopes, getResourceServerInfo, resources } from '#src/config/resources.ts';
import { getUserApps } from '#src/portal/apps/apps.ts';

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
    [
      'https://freal-api.bylukehurst.com/',
      'Freal',
      'freal:read freal:connect freal:admin',
      'https://freal.bylukehurst.com/',
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

describe('fife', () => {
  it('links the portal to its own hostname', () => {
    expect(
      getResourceServerInfo('https://fi37z0j9pg.execute-api.us-east-1.amazonaws.com/prod'),
    ).toMatchObject({ name: 'Fife', app: { url: 'https://fife.bylukehurst.com/' } });
  });
});

describe('lasso issuer', () => {
  it('names no Lambda URL in any resource', () => {
    expect(Object.keys(resources).filter((uri) => uri.includes('.lambda-url.'))).toEqual([]);
  });
});
