import { AppType, type ResourceRecord } from '#src/resources/types.ts';

export type SeedResource = Omit<ResourceRecord, 'createdAt'>;

function seed(
  resource: string,
  name: string,
  scopes: string[],
  app: SeedResource['app'],
): SeedResource {
  return { resource, metadata: { resource, resource_name: name, scopes_supported: scopes }, app };
}

/** The resources Lasso knew before they were stored in a table; copied in once by the seed script. */
export const seedResources: SeedResource[] = [
  seed('https://porto.bylukehurst.com/', 'Porto', ['porto:read', 'porto:write'], {
    type: AppType.Mcp,
    url: 'https://porto.bylukehurst.com/mcp',
  }),
  seed('https://victoria-mcp.bylukehurst.com/', 'Victoria', ['victoria:read', 'victoria:write'], {
    type: AppType.Mcp,
    url: 'https://victoria-mcp.bylukehurst.com/mcp',
  }),
  seed('https://victoria-viewer.bylukehurst.com/', 'Victoria Viewer', ['victoria:read'], {
    type: AppType.Web,
    url: 'https://victoria-viewer.bylukehurst.com/',
  }),
  seed(
    'https://fi37z0j9pg.execute-api.us-east-1.amazonaws.com/prod',
    'Fife',
    ['fife:read', 'fife:write', 'fife:admin'],
    { type: AppType.Web, url: 'https://fife.bylukehurst.com/' },
  ),
  seed(
    'https://freal-api.bylukehurst.com/',
    'Freal',
    ['freal:read', 'freal:connect', 'freal:admin'],
    { type: AppType.Web, url: 'https://freal.bylukehurst.com/' },
  ),
];
