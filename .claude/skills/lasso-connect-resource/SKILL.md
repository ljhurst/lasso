---
name: lasso-connect-resource
description: Register a project as a Lasso protected resource (API server) so it can verify Bearer JWTs from Lasso. Use when a project needs to accept tokens issued by Lasso — "make X a Lasso resource server", "verify Lasso tokens in Y", "protect this API with Lasso".
user-invocable: true
---

# Register as a Lasso resource server

Makes another project (an API/MCP server, not a browser app) accept and
verify access tokens issued by Lasso. This is the *resource server* side —
tokens are audience-bound to you via `resource=<your-indicator>`. For the
other direction (your app initiating login), see `lasso-connect-client`.

## 1. Pick a resource indicator

A stable URL identifying your project, usually its own base URL (e.g. the
Lambda Function URL or custom domain), no trailing path beyond `/`. Must be
unique across `src/config/resources.ts`.

## 2. Register the resource in Lasso (this repo)

Edit `src/config/resources.ts`:

```ts
const YOUR_PROJECT_RESOURCE_INDICATOR = 'https://your-project.example.com/';

// add to `resources`:
[YOUR_PROJECT_RESOURCE_INDICATOR]: {
  name: 'Your Project',
  scope: 'yourproject:read yourproject:write', // define whatever scopes you need
  accessTokenFormat: 'jwt',
  app: { type: AppType.Mcp, url: YOUR_PROJECT_RESOURCE_INDICATOR }, // optional, recommended
},
```

Scopes are free-form strings namespaced by project (`<project>:<action>`
convention). They're automatically merged into the global scope list via
`allResourceScopes` — no other config needed.

`app` is optional but recommended: it's what makes the resource show up on
the self-service `/apps` dashboard (`src/portal/apps/`). `type` is
`AppType.Web | AppType.Mcp | AppType.Api`; for `AppType.Mcp` it also
surfaces ready-made `claude mcp add` / MCP Inspector commands to users
granted the scope.

Commit, then deploy Lasso (`scripts/build_lambda.sh` + `terraform apply` from
`infra/`, per the root README) so the new resource is live.

## 3. In your project: verify tokens against Lasso's JWKS

Your project does NOT need the `oidc-provider` library or a shared secret.
Verify JWTs as a standard OAuth resource server:

1. Fetch Lasso's discovery doc once at startup / cache it:
   `GET <lasso-issuer>/.well-known/openid-configuration` — gives you
   `jwks_uri` and `issuer`.
2. Verify each incoming Bearer token against `jwks_uri` (e.g. with
   `jose`'s `createRemoteJWKSet` + `jwtVerify` in Node):
   - `issuer` must equal Lasso's issuer.
   - `audience` must equal your resource indicator from step 1.
3. Expose `.well-known/oauth-protected-resource` on your own project
   declaring Lasso as your authorization server, per RFC 9728 — this is
   what lets OAuth clients (e.g. Claude) discover which AS to authenticate
   against. See victoria's `docs/DESIGN.md` §5 for a worked example of this
   declaration.
4. Authorize by checking the token's `scope` claim contains whatever scope
   you defined in step 2 (`yourproject:read`, etc).

## 4. A client still needs to be able to request your resource

Registering the resource makes it *requestable*, but some OAuth client must
actually ask for `resource=<your-indicator>` with a scope you defined. If
that's a new client (not already-registered `claude-mcp` or similar), see
`lasso-connect-client` to register one.

For an `authorization_code` client, requesting the scope isn't sufficient —
each logged-in user also needs the scope granted via
`scripts/bootstrap/add-user.ts --grant-role <scope> --email <email>` (role
gating is enforced during consent). See `lasso-connect-client` step 2.
