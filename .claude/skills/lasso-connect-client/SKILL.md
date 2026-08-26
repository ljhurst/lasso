---
name: lasso-connect-client
description: Register an app as a Lasso OAuth client so it can log users in (or authenticate itself) via Lasso. Use when an app needs "log in with Lasso", human login through Lasso, or a machine-to-machine call authenticated via Lasso — "add Lasso login to X", "make Y a Lasso client".
user-invocable: true
---

# Register as a Lasso OAuth client

Makes another project able to initiate the OAuth dance against Lasso — either
a human logging in through a browser (authorization_code) or one service
calling another with no user present (client_credentials). This is the
*client* side. For a server verifying tokens it receives, see
`lasso-connect-resource` instead — most apps need both (a web app is a
client for login AND may need to be a resource if it has its own API).

## Which grant type?

- **A human logs in via redirect/browser** → `authorization_code` (+ PKCE).
  Most web apps.
- **Service A calls service B with no user present** → `client_credentials`.
  See `porto-victoria` in `src/config/clients.ts` for a worked example.

## 1. Register the client in Lasso (this repo)

Edit `src/config/clients.ts`, add an entry to the array returned by
`buildClients()`.

For a browser app (authorization_code):

```ts
{
  client_id: 'your-project',
  client_name: 'Your Project',
  redirect_uris: [
    'http://localhost:PORT/auth/callback',   // local dev
    'https://your-project.example.com/auth/callback',
  ],
  token_endpoint_auth_method: 'none',   // public client — PKCE, no secret
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  application_type: 'web',
},
```

For a machine-to-machine service (client_credentials):

```ts
{
  client_id: 'your-service-name',
  client_name: 'Your Service',
  client_secret: await getClientSecret(env.clientSecretSsmParams.yourServiceName),
  token_endpoint_auth_method: 'client_secret_basic',
  grant_types: ['client_credentials'],
  response_types: [],
  scope: 'target-resource:read target-resource:write', // scopes on the resource you're calling
},
```

For the confidential-client case, also:

- Add `LASSO_CLIENT__YOUR_SERVICE_NAME_SECRET_SSM_PARAM` to `src/env.ts`
  (`clientSecretSsmParams`).
- Generate the secret with `scripts/bootstrap/generate-client-secret.ts` and
  store it in SSM per that script's usage — mirrors how
  `portoVictoria`'s secret is provisioned.
- Wire the new Terraform SSM param / IAM access in `infra/` the same way the
  existing client secret param is wired.

Commit, then deploy Lasso (`scripts/build_lambda.sh` + `terraform apply`
from `infra/`, per the root README).

## 2. For authorization_code: grant the scope to each user

Requesting a resource scope in the flow below isn't enough on its own —
`filterGrantedScope()` (`src/interactions/routes.ts`) only actually grants a
resource scope during consent if it's in the logged-in user's `roles` array.
For every user who should get the new scope:

```bash
npx tsx scripts/bootstrap/add-user.ts --grant-role <scope> --email <email>
```

Skip this for `client_credentials` clients — there's no interactive consent,
so role-gating doesn't apply.

## 3. In your project: drive the OAuth flow

**authorization_code (browser login)** — standard Authorization Code + PKCE
against Lasso's endpoints (from
`<lasso-issuer>/.well-known/openid-configuration`):

1. Redirect the user to `authorization_endpoint` with
   `client_id`, `redirect_uri`, `response_type=code`, `scope` (include
   `openid` for an ID token, plus whichever resource scopes you need),
   `resource=<target-resource-indicator>` (RFC 8707 — required if the token
   needs to be usable against a specific resource server), and a PKCE
   `code_challenge`.
2. On callback, POST to `token_endpoint` with `grant_type=authorization_code`,
   `code`, `redirect_uri`, `client_id`, `code_verifier`. See
   `src/portal/auth/callback.ts` in this repo for a minimal worked example
   (Lasso's own portal is itself a Lasso client).
3. Store the resulting tokens per your project's session pattern.

**client_credentials (service-to-service)**:

```bash
curl -u your-service-name:SECRET \
  -d grant_type=client_credentials \
  -d "resource=<target-resource-indicator>" \
  <lasso-issuer>/token
```

The caller then sends the returned access token as a Bearer token to the
target service, which must be registered as a Lasso *resource* (see
`lasso-connect-resource`) to verify it.

## 4. Local dev

Include a `localhost` redirect URI in the client registration (see examples
above) so you can test the flow against a locally-running Lasso
(`npm run dev`, per the root README) before deploying.
