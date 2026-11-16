---
name: lasso-security-review
description: Security review of the pending Lasso change against this OIDC server's own threat model, plus a check of the system invariants. Use before every commit on code changes, after /step-back — "security review", "check this before I commit", /lasso-security-review. Pass `full` to audit the whole of src/ and infra/. Reports findings; changes nothing.
user-invocable: true
---

# Lasso security review

Lasso is the login for every other project, so a flaw here is a flaw
everywhere. Review the change as an attacker would, against the checklist
below, and report. Make no edits.

## Scope

Two modes, chosen by the argument.

**Default**: everything since the branch left the default branch, including
staged and uncommitted work, then the system invariants below.

```
git diff $(git merge-base HEAD origin/HEAD)
git diff --cached
```

Read the code around each hunk, not just the hunk.

**`full`**: every file under `src/` and `infra/`, plus `package.json`. Run
the whole checklist against all of it, then the invariants. Say in the report
that it was a full audit.

## Bar

Report only concrete, exploitable issues you are at least 8/10 sure of.
Skip denial of service, rate limiting, hardening that isn't a hole, log
spoofing, theoretical races and outdated libraries. For each finding give
file and line, severity (High, Medium, Low), category, what is wrong, how it
is exploited, and the fix.

If nothing meets the bar, say so, and list what you checked and ruled out.

## Checklist

Answer each question against the diff. Skip a question the diff cannot affect.

- **Clients and redirects** (`src/config/clients.ts`): exact redirect URI
  matching, PKCE required, no new wildcard or localhost origin, client
  secrets only in SSM.
- **Scopes and roles** (`src/interactions/routes.ts`): consent grants only
  scopes the account's roles allow, denied scopes are rejected so the consent
  loop ends, and each resource gets its own audience.
- **Login** (`src/interactions/routes.ts`, `src/users/`): every failure
  returns the same page, rejected logins still spend a password check, the
  throttle is counted before the password is checked, and email
  normalization is the same in the store, the throttle and the logs.
- **Passwords**: scrypt parameters, the 12-character policy, randomness of
  temporary passwords, and the forced change cannot be skipped.
- **Origin trust** (`src/auth/origin-verify.ts`, `src/auth/client-ip.ts`):
  the guard runs before every router, the secret is compared in constant
  time, the viewer address is trusted only after the guard, and
  `X-Forwarded-For` is never used.
- **Sessions and cookies** (`src/portal/auth/`, `src/auth/pkce.ts`): signing,
  `HttpOnly`, `Secure` and `SameSite`, PKCE cookie scoped and cleared, state
  checked before the code is exchanged.
- **Admin** (`src/portal/admin/`): the admin role is checked on every
  handler including POSTs, state-changing forms resist CSRF, and revocation
  actually revokes.
- **Output**: views never put user data into raw or unescaped HTML.
- **Logs** (`src/observability/`): no passwords, tokens, codes, typed
  emails, query strings or interaction uids.
- **Storage** (`src/adapter/`): key construction cannot reach another record
  type, and expiry is set.
- **Infra** (`infra/*.tf`): IAM stays least-privilege, nothing is exposed
  beyond CloudFront, and no secret lands in Terraform state or environment.
- **Dependencies** (`package.json`, lock file): new packages, install
  scripts, and versions looked up rather than guessed.

## System invariants

Check these against the code as it stands after the change, whatever the diff
touches. Answer pass or fail for each, with the file and line that proves it.

1. The origin guard is registered before every router in `src/server.ts`.
2. Every admin route sits behind the admin check: `router.use(requirePortalSession, requireAdmin)`
   is the first thing in `buildAdminRouter` (`src/portal/admin/routes.ts`),
   and no admin route is added outside it.
3. A failed login, whatever the reason, returns the same page and still
   spends a password check (`authenticate` in `src/interactions/routes.ts`).
4. Consent never grants a scope the account's roles don't hold
   (`partitionScopeByRoles` is the only path).
5. Redirect URIs in `src/config/clients.ts` are exact strings. List every
   `localhost` or `127.0.0.1` entry so a new one is noticed.
6. Every cookie the code sets is `httpOnly`, `sameSite`, signed where it
   carries state, and `secure` when served over https.
7. No log line carries a password, token, code, typed email, query string or
   interaction uid: check `src/observability/` and every `console.*` in `src/`.
8. Every DynamoDB record that should expire gets `expiresAt`
   (`src/adapter/keys.ts`, `src/users/login-throttle.ts`).
9. Terraform grants no `Resource: *` and exposes nothing beyond CloudFront;
   index ARNs (`…/index/*`) are fine.

## Report

Group findings High, Medium, Low; number them straight through. Then one
line: "Invariants: n of 9 hold", naming any that don't. End with one line
saying which to fix first. The user picks, then a plan follows before
any code changes.
