import type Provider from 'oidc-provider';
import type { KoaContextWithOIDC } from 'oidc-provider';

import { logEvent } from '#src/observability/events.ts';

export function attachProviderEvents(provider: Provider): void {
  provider.on('grant.success', (ctx) => {
    const { AccessToken, RefreshToken } = ctx.oidc.entities;
    logEvent({
      event: 'token_issued',
      clientId: ctx.oidc.client?.clientId,
      sub: AccessToken?.accountId ?? RefreshToken?.accountId,
      grantType: ctx.oidc.params?.grant_type as string | undefined,
    });
  });

  provider.on('grant.error', (ctx, error) => logError('grant', ctx, error));
  provider.on('authorization.error', (ctx, error) => logError('authorization', ctx, error));
  provider.on('server_error', (ctx, error) => logError('server', ctx, error));
}

function logError(kind: string, ctx: KoaContextWithOIDC, error: Error): void {
  logEvent({
    event: 'oidc_error',
    kind,
    clientId: ctx.oidc?.client?.clientId,
    message: error.message,
  });
}
