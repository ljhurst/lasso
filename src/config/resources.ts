import type { ResourceServer } from 'oidc-provider';

const PORTO_RESOURCE_INDICATOR =
  'https://dpuc6r44q5s4rn2kj24rmgrxga0uxwgr.lambda-url.us-east-1.on.aws/';

const VICTORIA_RESOURCE_INDICATOR =
  'https://diozeathy56roah5fxesmhji640ugrkn.lambda-url.us-east-1.on.aws/';

export const resources: Record<string, ResourceServer> = {
  [PORTO_RESOURCE_INDICATOR]: {
    scope: 'porto:read porto:write',
    accessTokenFormat: 'jwt',
  },
  [VICTORIA_RESOURCE_INDICATOR]: {
    scope: 'victoria:read victoria:write',
    accessTokenFormat: 'jwt',
  },
};

export function getResourceServerInfo(resourceIndicator: string): ResourceServer {
  const resource = resources[resourceIndicator];
  if (!resource) {
    throw new Error(`unknown resource indicator: ${resourceIndicator}`);
  }
  return resource;
}
