import type { ResourceServer } from 'oidc-provider';

export interface NamedResourceServer extends ResourceServer {
  name: string;
}

const PORTO_RESOURCE_INDICATOR =
  'https://dpuc6r44q5s4rn2kj24rmgrxga0uxwgr.lambda-url.us-east-1.on.aws/';

const VICTORIA_RESOURCE_INDICATOR =
  'https://diozeathy56roah5fxesmhji640ugrkn.lambda-url.us-east-1.on.aws/';

const FIFE_RESOURCE_INDICATOR = 'https://vxzzln3s2i.execute-api.us-east-1.amazonaws.com/prod';

export const resources: Record<string, NamedResourceServer> = {
  [PORTO_RESOURCE_INDICATOR]: {
    name: 'Porto',
    scope: 'porto:read porto:write',
    accessTokenFormat: 'jwt',
  },
  [VICTORIA_RESOURCE_INDICATOR]: {
    name: 'Victoria',
    scope: 'victoria:read victoria:write',
    accessTokenFormat: 'jwt',
  },
  [FIFE_RESOURCE_INDICATOR]: {
    name: 'Fife',
    scope: 'fife:read fife:write',
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
