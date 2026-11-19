export const AppType = {
  Web: 'web',
  Mcp: 'mcp',
  Api: 'api',
} as const;

export type AppType = (typeof AppType)[keyof typeof AppType];

/** How a resource appears on the portal's apps page. */
export interface ResourceApp {
  type: AppType;
  url?: string;
  logo?: string;
}

/**
 * What a resource says about itself, named as in OAuth Protected Resource
 * Metadata. Its identifier is the row's key, so it is not repeated here.
 */
export interface RegisteredResource {
  resource_name: string;
  scopes_supported: string[];
}

export interface ResourceRecord {
  resource: string;
  createdAt: string;
  metadata: RegisteredResource;
  app?: ResourceApp;
}

/** A resource as the rest of the app uses it, whether it is stored or built in. */
export interface Resource {
  indicator: string;
  name: string;
  scopes: string[];
  app?: ResourceApp;
  builtIn: boolean;
}

export function toResource(record: ResourceRecord): Resource {
  return {
    indicator: record.resource,
    name: record.metadata.resource_name,
    scopes: record.metadata.scopes_supported,
    app: record.app,
    builtIn: false,
  };
}
