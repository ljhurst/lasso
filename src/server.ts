import { createServer, type RequestListener } from 'node:http';

import { buildApp } from '#src/app.ts';
import { env } from '#src/env.ts';
import { createLiveApp } from '#src/live-app.ts';
import { resourceRegistry } from '#src/resources/services.ts';

/** How often a running instance checks whether the resources changed, and so whether it needs a new provider. */
const RESOURCE_REFRESH_MS = 10_000;

async function main(): Promise<void> {
  const configStart = performance.now();
  const handler = await createLiveApp({
    build: () => buildApp(resourceRegistry),
    readVersion: async () => (await resourceRegistry.scopes()).join(' '),
    ttlMs: RESOURCE_REFRESH_MS,
    onError: (error) => console.error(error),
  });
  const configMs = performance.now() - configStart;

  const guarded = Boolean(env.originVerifySsmParam);
  createServer(handler as RequestListener).listen(env.port, () => {
    const startupMs = performance.now();
    console.log(
      `lasso listening on :${env.port} (startup ${startupMs.toFixed(0)} ms, config ${configMs.toFixed(0)} ms, origin guard ${guarded ? 'on' : 'off'})`,
    );
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
