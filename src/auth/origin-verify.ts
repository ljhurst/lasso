import { createHash, timingSafeEqual } from 'node:crypto';
import type Koa from 'koa';

/**
 * Refuses requests that did not come through CloudFront. CloudFront presents a
 * secret in X-Origin-Verify and the viewer's address in X-Viewer-Ip, replacing
 * anything a client sent; the address is only trusted once the secret matches.
 */
export function originGuard(secret: string): Koa.Middleware {
  if (!secret) {
    throw new Error('origin verify secret is empty');
  }
  const expected = digest(secret);

  return async (ctx, next) => {
    if (!timingSafeEqual(digest(ctx.get('x-origin-verify')), expected)) {
      ctx.status = 403;
      return;
    }
    ctx.state.viewerIp = ctx.get('x-viewer-ip');
    await next();
  };
}

// Hashing first gives timingSafeEqual equal-length inputs without revealing the secret's length.
function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
