import { describe, expect, it, vi } from 'vitest';

import { buildClients } from '#src/config/clients.ts';
import { allResourceScopes, getResourceServerInfo, resources } from '#src/config/resources.ts';
import { getUserApps } from '#src/portal/apps/routes.ts';

vi.mock('#src/config/ssm.ts', () => ({
  getParameter: vi.fn().mockResolvedValue('client-secret'),
}));

const PORTO_ALIAS = 'https://porto.bylukehurst.com/';

const portoLambdaUrl = () =>
  Object.keys(resources).find(
    (indicator) => indicator.includes('.lambda-url.') && resources[indicator]?.name === 'Porto',
  );

describe('custom domain resources', () => {
  it('accepts the porto alias with the same scopes as its Lambda URL', () => {
    const original = portoLambdaUrl();

    expect(original).toBeDefined();
    expect(getResourceServerInfo(PORTO_ALIAS)).toMatchObject({
      name: 'Porto',
      scope: resources[original as string]?.scope,
      accessTokenFormat: 'jwt',
    });
  });

  it('keeps the porto Lambda URL working', () => {
    expect(getResourceServerInfo(portoLambdaUrl() as string)).toMatchObject({
      scope: 'porto:read porto:write',
    });
  });

  it.each([
    ['https://victoria-mcp.bylukehurst.com/', 'Victoria', 'victoria:read victoria:write'],
    ['https://victoria-viewer.bylukehurst.com/', 'Victoria Viewer', 'victoria:read'],
  ])('serves %s with its scopes and portal link', (indicator, name, scope) => {
    expect(getResourceServerInfo(indicator)).toMatchObject({
      name,
      scope,
      accessTokenFormat: 'jwt',
      app: { url: indicator },
    });
  });

  it.each([
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
  it('lists each app once and never an alias', () => {
    const apps = getUserApps([...allResourceScopes]);
    const names = apps.map((app) => app.resource.name);

    expect(new Set(names).size).toBe(names.length);
    expect(apps.map((app) => app.indicator)).not.toContain(PORTO_ALIAS);
  });

  it('keeps the aliases out of the registry the portal lists', () => {
    expect(Object.keys(resources)).not.toContain(PORTO_ALIAS);
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
