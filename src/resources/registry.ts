import type { ResourceStore } from '#src/resources/storage/store.ts';
import { type Resource, toResource } from '#src/resources/types.ts';

export interface ResourceRegistry {
  list(): Promise<Resource[]>;
  get(indicator: string): Promise<Resource | undefined>;
  /** Every scope any resource offers, once each, in a stable order. */
  scopes(): Promise<string[]>;
}

/** Stored resources plus the ones built into Lasso; a built-in wins over a stored resource with the same indicator. */
export function createResourceRegistry(
  store: ResourceStore,
  builtIns: readonly Resource[],
): ResourceRegistry {
  async function list(): Promise<Resource[]> {
    const merged = new Map<string, Resource>();
    for (const record of await store.list()) {
      merged.set(record.resource, toResource(record));
    }
    for (const builtIn of builtIns) {
      merged.set(builtIn.indicator, builtIn);
    }
    return [...merged.values()].toSorted((a, b) => a.name.localeCompare(b.name));
  }

  return {
    list,

    async get(indicator) {
      const builtIn = builtIns.find((resource) => resource.indicator === indicator);
      if (builtIn) {
        return builtIn;
      }
      const record = await store.get(indicator);
      return record && toResource(record);
    },

    async scopes() {
      const scopes = (await list()).flatMap((resource) => resource.scopes);
      return [...new Set(scopes)].toSorted();
    },
  };
}
