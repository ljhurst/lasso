import { docClient } from '#src/aws/dynamo.ts';
import { builtInResources } from '#src/resources/built-in.ts';
import { env } from '#src/env.ts';
import { createResourceRegistry } from '#src/resources/registry.ts';
import { createResourceStore } from '#src/resources/storage/store.ts';

export const resourceStore = createResourceStore(docClient, env.resourcesTableName);

export const resourceRegistry = createResourceRegistry(resourceStore, builtInResources);
