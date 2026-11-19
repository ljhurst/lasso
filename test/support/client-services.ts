import type { ClientServices } from '#src/clients/register.ts';
import type { ClientRecord } from '#src/clients/types.ts';

export interface FakeClientServices extends ClientServices {
  rows: Map<string, ClientRecord>;
  secrets: ClientServices['secrets'] & { values: Map<string, string> };
}

/** In-memory client table and secret store that behave like the real ones, conditions included. */
export function fakeClientServices(initial: ClientRecord[] = []): FakeClientServices {
  const rows = new Map(initial.map((client) => [client.clientId, client]));
  const values = new Map<string, string>();
  return {
    rows,
    store: {
      async get(clientId) {
        return rows.get(clientId);
      },
      async list() {
        return [...rows.values()];
      },
      async create(record) {
        if (rows.has(record.clientId)) {
          throw Object.assign(new Error('exists'), { name: 'ConditionalCheckFailedException' });
        }
        rows.set(record.clientId, record);
      },
      async replace(record) {
        if (!rows.has(record.clientId)) {
          throw Object.assign(new Error('missing'), { name: 'ConditionalCheckFailedException' });
        }
        rows.set(record.clientId, record);
      },
      async remove(clientId) {
        rows.delete(clientId);
      },
    },
    secrets: {
      values,
      async put(name, value) {
        values.set(name, value);
      },
      async remove(name) {
        values.delete(name);
      },
    },
  };
}
