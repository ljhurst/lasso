import type Koa from 'koa';

const UNKNOWN_IP = 'unknown';

/**
 * The address AWS saw on the connection, as passed on by the Lambda Web
 * Adapter. X-Forwarded-For is deliberately not used: a client can put
 * anything in front of the real address.
 */
export function clientIp(ctx: Koa.Context): string {
  try {
    const context = JSON.parse(ctx.get('x-amzn-request-context'));
    const sourceIp = context?.http?.sourceIp;
    return typeof sourceIp === 'string' && sourceIp.length > 0 ? sourceIp : UNKNOWN_IP;
  } catch {
    return UNKNOWN_IP;
  }
}
