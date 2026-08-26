import type { ResourceServer } from 'oidc-provider';
import { env } from '../env.ts';

export const AppType = {
  Web: 'web',
  Mcp: 'mcp',
  Api: 'api',
} as const;

export type AppType = (typeof AppType)[keyof typeof AppType];

export interface AppInfo {
  type: AppType;
  url?: string;
  logo?: string;
}

export interface NamedResourceServer extends ResourceServer {
  name: string;
  app?: AppInfo;
}

const PORTO_RESOURCE_INDICATOR =
  'https://dpuc6r44q5s4rn2kj24rmgrxga0uxwgr.lambda-url.us-east-1.on.aws/';

const VICTORIA_RESOURCE_INDICATOR =
  'https://diozeathy56roah5fxesmhji640ugrkn.lambda-url.us-east-1.on.aws/';

const FIFE_RESOURCE_INDICATOR = 'https://fi37z0j9pg.execute-api.us-east-1.amazonaws.com/prod';
const FIFE_APP_URL = 'https://d3de9r2gorcf05.cloudfront.net/';

export const LASSO_RESOURCE_INDICATOR = env.issuer;
export const LASSO_ADMIN_SCOPE = 'lasso:admin';

export const resources: Record<string, NamedResourceServer> = {
  [PORTO_RESOURCE_INDICATOR]: {
    name: 'Porto',
    scope: 'porto:read porto:write',
    accessTokenFormat: 'jwt',
    app: { type: AppType.Mcp, url: PORTO_RESOURCE_INDICATOR },
  },
  [VICTORIA_RESOURCE_INDICATOR]: {
    name: 'Victoria',
    scope: 'victoria:read victoria:write',
    accessTokenFormat: 'jwt',
    app: { type: AppType.Mcp, url: VICTORIA_RESOURCE_INDICATOR },
  },
  [FIFE_RESOURCE_INDICATOR]: {
    name: 'Fife',
    scope: 'fife:read fife:write fife:admin',
    accessTokenFormat: 'jwt',
    app: { type: AppType.Web, url: FIFE_APP_URL },
  },
  [LASSO_RESOURCE_INDICATOR]: {
    name: 'Lasso Admin',
    scope: LASSO_ADMIN_SCOPE,
    accessTokenFormat: 'jwt',
  },
};

export const allResourceScopes = [
  ...new Set(Object.values(resources).flatMap((r) => r.scope?.split(' ') ?? [])),
];

export function getResourceServerInfo(resourceIndicator: string): ResourceServer {
  const resource = resources[resourceIndicator];
  if (!resource) {
    throw new Error(`unknown resource indicator: ${resourceIndicator}`);
  }
  return resource;
}
