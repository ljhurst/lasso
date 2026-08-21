import type { ResourceServer } from 'oidc-provider';

// Resource identifier is a placeholder pending the real domain decision
// (DESIGN §8) and Porto's own registration.
const PORTO_RESOURCE_INDICATOR = 'https://porto.example.com';

const resources: Record<string, ResourceServer> = {
  [PORTO_RESOURCE_INDICATOR]: {
    scope: 'porto:read porto:write',
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
