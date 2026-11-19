import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import Provider from 'oidc-provider';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamoAdapter } from '#src/adapter/dynamo-adapter.ts';
import { makeClient, makeMachineClient } from '#test/support/clients.ts';

vi.mock('#src/config/ssm.ts', () => ({ getParameter: vi.fn(async () => 'table-secret') }));

const ddbMock = mockClient(DynamoDBDocumentClient);
const records = new Map([
  ['my-app', makeClient()],
  ['my-service', makeMachineClient()],
]);

let server: Server;
let base: string;

beforeAll(async () => {
  const provider = new Provider('https://lasso.example.com', {
    adapter: DynamoAdapter,
    clients: [],
    scopes: ['openid', 'offline_access', 'victoria:read'],
    features: { clientCredentials: { enabled: true } },
  });
  provider.proxy = true;
  server = createServer(provider.callback());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

beforeEach(() => {
  ddbMock.reset();
  ddbMock.on(GetCommand).callsFake((input) => ({
    Item: input.TableName === 'lj-lasso-clients-test' ? records.get(input.Key.clientId) : undefined,
  }));
});

describe('clients stored in the table', () => {
  it('starts a sign-in for a registered client and rejects an unregistered redirect uri', async () => {
    const params = (redirectUri: string) =>
      new URLSearchParams({
        client_id: 'my-app',
        response_type: 'code',
        scope: 'openid',
        redirect_uri: redirectUri,
        code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        code_challenge_method: 'S256',
      });

    const ok = await fetch(`${base}/auth?${params('https://app.example.com/callback')}`, {
      redirect: 'manual',
    });
    const bad = await fetch(`${base}/auth?${params('https://evil.example.com/callback')}`, {
      redirect: 'manual',
    });

    expect(ok.status).toBe(303);
    expect(ok.headers.get('location')).toMatch(/\/auth\/|interaction/);
    expect(bad.status).toBe(400);
  });

  it('answers an unknown client as invalid', async () => {
    const res = await fetch(`${base}/auth?client_id=ghost&response_type=code`, {
      redirect: 'manual',
    });

    expect(res.status).toBe(400);
  });

  it('issues a client-credentials token only for the right secret', async () => {
    const token = (secret: string) =>
      fetch(`${base}/token`, {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`my-service:${secret}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&scope=victoria:read',
      });

    const good = await token('table-secret');
    const bad = await token('wrong');

    expect(good.status).toBe(200);
    expect(await good.json()).toMatchObject({ token_type: 'Bearer', scope: 'victoria:read' });
    expect(bad.status).toBe(401);
  });
});
