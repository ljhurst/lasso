import { createHash, randomBytes } from 'node:crypto';
import type Koa from 'koa';

const PKCE_COOKIE_TTL_MS = 5 * 60 * 1000;

interface PkceState {
  verifier: string;
  state: string;
  returnTo: string;
}

interface PkceArea {
  cookieName: string;
  path: string;
}

export function requestOrigin(ctx: Koa.Context): string {
  return `${ctx.protocol}://${ctx.host}`;
}

export function generateVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function deriveChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function setPkceCookie(ctx: Koa.Context, area: PkceArea, value: PkceState): void {
  ctx.cookies.set(area.cookieName, Buffer.from(JSON.stringify(value)).toString('base64url'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: ctx.secure,
    maxAge: PKCE_COOKIE_TTL_MS,
    path: area.path,
  });
}

export function readPkceCookie(ctx: Koa.Context, area: PkceArea): PkceState | undefined {
  const raw = ctx.cookies.get(area.cookieName);
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as PkceState;
  } catch {
    return undefined;
  }
}

export function clearPkceCookie(ctx: Koa.Context, area: PkceArea): void {
  ctx.cookies.set(area.cookieName, null, { path: area.path });
}
