import type { ResourceServices } from '#src/resources/register.ts';
import type { ResourceRecord } from '#src/resources/types.ts';

export interface FakeResourceServices extends ResourceServices {
  rows: Map<string, ResourceRecord>;
  held: Set<string>;
}

/** In-memory resource table that behaves like the real one, conditions included. */
export function fakeResourceServices(initial: ResourceRecord[] = []): FakeResourceServices {
  const rows = new Map(initial.map((record) => [record.resource, record]));
  const held = new Set<string>();
  return {
    rows,
    held,
    reserved: { scopes: ['lasso:admin'], resources: ['https://lasso.example.com'] },
    scopesHeldByClients: async () => held,
    store: {
      async get(resource) {
        return rows.get(resource);
      },
      async list() {
        return [...rows.values()];
      },
      async create(record) {
        if (rows.has(record.resource)) {
          throw Object.assign(new Error('exists'), { name: 'ConditionalCheckFailedException' });
        }
        rows.set(record.resource, record);
      },
      async replace(record) {
        if (!rows.has(record.resource)) {
          throw Object.assign(new Error('missing'), { name: 'ConditionalCheckFailedException' });
        }
        rows.set(record.resource, record);
      },
      async remove(resource) {
        rows.delete(resource);
      },
    },
  };
}
