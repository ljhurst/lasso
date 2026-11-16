# xss-scan

Fails the build when a view prints a value without `safe`. `@kitajs/html` does not
escape `{value}` by default, so every non-constant value needs `safe` on its element
(or `Html.escapeHtml`).

Run with `npm run xss-scan` from the repo root. It also runs in `npm run preflight`
and as a pre-commit hook.

This is a separate package because the checker uses the TypeScript compiler API, which
the repo's TypeScript 7 no longer exposes, so it pins TypeScript 5.9 and reads the
repo's `src/` through the root `tsconfig.json`.
