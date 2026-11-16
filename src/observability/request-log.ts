import type Koa from 'koa';
import type { KoaContextWithOIDC } from 'oidc-provider';

import { clientIp } from '#src/auth/client-ip.ts';
import { logEvent } from '#src/observability/events.ts';

/** Logs one line per request: method, path, status and duration. Query strings are never logged. */
export function requestLog(): Koa.Middleware<Koa.DefaultState, KoaContextWithOIDC> {
  return async (ctx, next) => {
    const start = performance.now();
    let failure: { status: number; error: string } | undefined;
    try {
      await next();
    } catch (error) {
      failure = {
        status: (error as { status?: number }).status ?? 500,
        error: error instanceof Error ? error.message : String(error),
      };
      throw error;
    } finally {
      const clientId = ctx.oidc?.client?.clientId;
      logEvent({
        event: 'request',
        method: ctx.method,
        path: redactPath(ctx.path),
        status: failure?.status ?? ctx.status,
        ms: Math.round(performance.now() - start),
        ip: clientIp(ctx),
        ...(clientId ? { clientId } : {}),
        ...(failure ? { error: failure.error } : {}),
      });
    }
  };
}

function redactPath(path: string): string {
  return path.replace(UID_PATH, '/$1/:uid');
}

const UID_PATH = /^\/(interaction|auth|device)\/(?!auth(?:\/|$))[^/]+/;
