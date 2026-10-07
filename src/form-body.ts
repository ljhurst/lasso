import type { Context } from 'koa';

const MAX_BYTES = 56 * 1024;

/**
 * Reads an `application/x-www-form-urlencoded` request body. Any other
 * content type yields empty params, so handlers treat it like a form with
 * every field missing.
 */
export async function readForm(ctx: Context): Promise<URLSearchParams> {
  if (!ctx.is('application/x-www-form-urlencoded')) {
    return new URLSearchParams();
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of ctx.req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BYTES) {
      ctx.throw(413);
    }
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}
