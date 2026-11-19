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
  Most web apps. Register it as an **app**.
- **Service A calls service B with no user present** → `client_credentials`.
  Register it as a **service**; it gets a secret.

## 1. Register the client in Lasso

Clients live in the `lj-lasso-clients` table, not in code, and a new one works
on its next request with no deploy.

**Admin portal (everyday):** Clients & resources → Add client. Enter a client
ID, a name, and for an app its redirect URIs (https, or http on localhost) and
post-logout URIs; for a service, the scopes it may request. A service's secret
is shown once on the next page; store it where the service reads its config.

**CLI (when the portal can't be reached):**

```bash
npm run add-client -- --id your-project --name "Your Project" \
  --redirect-uri http://localhost:PORT/auth/callback \
  --redirect-uri https://your-project.example.com/auth/callback

npm run add-client -- --id your-service --name "Your Service" --kind service \
  --scope target-resource:read --scope target-resource:write
```

The CLI runs the same code as the portal and prints a service's secret once.
Secrets are SecureString parameters at `/lasso/client/<id>-secret`; Terraform
never manages them. A service can't be given `lasso:admin`, and the portal's
own client (`lasso-portal`) can't be edited or deleted from the portal.

## 2. For authorization_code: grant the scope to each user

Requesting a resource scope in the flow below isn't enough on its own —
`applyResourceConsent()` (`src/interactions/consent.ts`) only actually grants a
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
