import type { RequestListener } from 'node:http';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '#src/app.ts';
import { createLiveApp } from '#src/live-app.ts';
import type { ResourceRecord } from '#src/resources/types.ts';
import { serve, type TestServer } from '#test/support/http.ts';
import { makeResource, registryWithBuiltIns } from '#test/support/resources.ts';

const ORIGIN_SECRET = 'origin-secret';

vi.hoisted(() => {
  process.env.LASSO_ORIGIN_VERIFY_SSM_PARAM = '/lasso/origin-verify-test';
});

vi.mock('#src/aws/ssm.ts', async () => {
  const { generateKeyPair, exportJWK, calculateJwkThumbprint } = await import('jose');
  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  const jwk = await exportJWK(privateKey);
  const kid = await calculateJwkThumbprint(jwk);
  const jwks = JSON.stringify({ keys: [{ ...jwk, alg: 'RS256', use: 'sig', kid }] });
  const values: Record<string, string> = {
    '/lasso/jwks-test': jwks,
    '/lasso/cookie-key-test': 'cookie-key-test-value',
    '/lasso/origin-verify-test': 'origin-secret',
    '/lasso/client/my-service-secret': 'table-secret',
  };
  return {
    getParameters: async () => new Map(Object.entries(values)),
    getParameter: async (name: string) => values[name] as string,
  };
});

vi.mock('#src/clients/services.ts', async () => {
  const { fakeClientServices } = await import('#test/support/client-services.ts');
  const { makeConfidentialClient } = await import('#test/support/clients.ts');
  return {
    clientServices: fakeClientServices([makeConfidentialClient({ scope: 'example:read' })]),
  };
});

mockClient(DynamoDBDocumentClient).onAnyCommand().resolves({});

const stored: ResourceRecord[] = [];
const registry = registryWithBuiltIns(stored);
const EXAMPLE = 'https://api.example.com/';

let server: TestServer;

beforeAll(async () => {
  const handler = await createLiveApp({
    build: () => buildApp(registry),
    readVersion: async () => (await registry.scopes()).join(' '),
    ttlMs: 0,
  });
  server = await serve(handler as RequestListener);
});

afterAll(() => {
  server.close();
});

function token(scope: string, resource = EXAMPLE) {
  return fetch(`${server.baseUrl}/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from('my-service:table-secret').toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
      'x-origin-verify': ORIGIN_SECRET,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope, resource }),
  });
}

async function discoveryScopes(): Promise<string[]> {
  const response = await fetch(`${server.baseUrl}/.well-known/openid-configuration`, {
    headers: { 'x-origin-verify': ORIGIN_SECRET },
  });
  return ((await response.json()) as { scopes_supported: string[] }).scopes_supported;
}

function claimsOf(accessToken: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString());
}

describe('a resource registered while Lasso is running', () => {
  it('is unknown until it exists', async () => {
    expect((await token('example:read')).status).toBeGreaterThanOrEqual(400);
    expect(await discoveryScopes()).not.toContain('example:read');
  });

  it('gets tokens as soon as it is registered, with no restart', async () => {
    stored.push(makeResource());

    const response = await token('example:read');
    const body = (await response.json()) as { access_token: string; scope: string };

    expect(response.status).toBe(200);
    expect(body.scope).toBe('example:read');
    expect(claimsOf(body.access_token)).toMatchObject({ aud: EXAMPLE, scope: 'example:read' });
  });

  it('still holds a client to the scopes it was given', async () => {
    const response = await token('example:write');

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'invalid_scope' });
  });

  it('lists its scopes in discovery', async () => {
    expect(await discoveryScopes()).toEqual(
      expect.arrayContaining(['example:read', 'example:write']),
    );
  });

  it('keeps the origin guard in front of every router after the provider was rebuilt', async () => {
    for (const path of [
      '/.well-known/openid-configuration',
      '/portal',
      '/apps',
      '/admin',
      '/interaction/x',
    ]) {
      const refused = await fetch(`${server.baseUrl}${path}`, { redirect: 'manual' });
      const allowed = await fetch(`${server.baseUrl}${path}`, {
        redirect: 'manual',
        headers: { 'x-origin-verify': ORIGIN_SECRET },
      });

      expect(refused.status, path).toBe(403);
      expect(allowed.status, path).not.toBe(403);
    }
  });

  it('stops working once it is removed', async () => {
    stored.length = 0;

    expect((await token('example:read')).status).toBeGreaterThanOrEqual(400);
    expect(await discoveryScopes()).not.toContain('example:read');
  });
});
