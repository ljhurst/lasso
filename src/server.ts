import { createServer } from 'node:http';

import Provider from 'oidc-provider';

import { buildConfiguration } from './config/index.ts';
import { env } from './env.ts';
import { buildInteractionRouter } from './interactions/routes.ts';

async function main(): Promise<void> {
  const configuration = await buildConfiguration();
  const provider = new Provider(env.issuer, configuration);
  // Lambda Web Adapter terminates TLS upstream and forwards plain HTTP
  // locally — without this, oidc-provider builds every endpoint URL (except
  // the issuer itself) as http:// instead of https://.
  provider.proxy = true;

  const interactions = buildInteractionRouter(provider);
  provider.app.use(interactions.routes());
  provider.app.use(interactions.allowedMethods());

  createServer(provider.callback()).listen(env.port, () => {
    console.log(`lasso listening on :${env.port}`);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
