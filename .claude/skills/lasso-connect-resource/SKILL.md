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

A stable URL identifying your project (RFC 8707), usually its own base URL
or custom domain, no trailing path beyond `/`. It must be https (or http on
localhost) and unique among the registered resources.

## 2. Register the resource in Lasso

Resources live in the `lj-lasso-resources` table, not in code, and a new one
works within seconds with no deploy.

**Admin portal (everyday):** Clients & resources → Add resource. Enter the
indicator, a name, the scopes (one per line, `<project>:<action>`), and
optionally how the apps page shows it (web app, MCP server or API) and its
link. For an MCP server, users granted a scope also get ready-made
`claude mcp add` and MCP Inspector commands on the apps page.

**CLI (when the portal can't be reached):**

```bash
npm run add-resource -- --resource https://your-project.example.com/ \
  --name "Your Project" --scope yourproject:read --scope yourproject:write \
  --app-type mcp --app-url https://your-project.example.com/mcp
```

Add `--dry-run` to check it against the table without writing. The CLI runs
the same code as the portal.

Scopes become roles: grant them to users on the Users page, and to
`client_credentials` clients on their Client page. `lasso:admin` and Lasso's
own indicator are reserved. Deleting a resource, or removing a scope from it,
is refused while a client still holds a scope only that resource offers, and
it ends the grants that reached it.

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
