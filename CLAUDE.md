# Lasso

Lasso is the login for every other project, so security beats convenience
here.

## Before committing a code change

1. Run `/step-back` and fix what it finds.
2. Run `/lasso-security-review` (the diff plus the system invariants) and fix
   what it finds.
3. Run `pre-commit run --all-files`.

Run `/lasso-security-review full` before a release, after any large auth or
infra change, and at least monthly.

Put the results of both reviews in the PR's Validation section. Doc-, test-
and CI-only changes can skip step 2 unless they touch auth, config or infra.
