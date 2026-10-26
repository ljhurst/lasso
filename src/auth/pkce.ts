import { createHash, randomBytes } from 'node:crypto';
import type Koa from 'koa';
import { env } from '#src/env.ts';

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

export function issuerOrigin(): string {
  return new URL(env.issuer).origin;
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
    signed: true,
  });
}

export function readPkceCookie(ctx: Koa.Context, area: PkceArea): PkceState | undefined {
  const raw = ctx.cookies.get(area.cookieName, { signed: true });
  if (!raw) {
    return undefined;
  }
  try {
    return parsePkceState(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')));
  } catch {
    return undefined;
  }
}

export function clearPkceCookie(ctx: Koa.Context, area: PkceArea): void {
  ctx.cookies.set(area.cookieName, null, { path: area.path });
}

function parsePkceState(value: unknown): PkceState | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { verifier, state, returnTo } = value as Record<string, unknown>;
  if (!isNonEmptyString(verifier) || !isNonEmptyString(state) || !isNonEmptyString(returnTo)) {
    return undefined;
  }
  return isLocalPath(returnTo) ? { verifier, state, returnTo } : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isLocalPath(value: string): boolean {
  return /^\/(?![/\\])/.test(value) && !/\p{Cc}/u.test(value);
}
