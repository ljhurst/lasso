# Lasso

Luke's Anytime SSO — a single, self-hosted OAuth 2.1 / OIDC authorization
server for all personal projects: one identity, one login, correctly
audience-scoped tokens per app. Built on
[`oidc-provider`](https://github.com/panva/node-oidc-provider). See
[`docs/DESIGN.md`](docs/DESIGN.md) for the full design.

## Repo structure

- [`docs/DESIGN.md`](docs/DESIGN.md) — architecture and design decisions
- [`src/`](src/) — the Node/TypeScript Lambda service
  - `adapter/` — the DynamoDB `Adapter` implementation for oidc-provider
  - `config/` — oidc-provider `Configuration`: clients, resources, JWKS
  - `interactions/` — the single-user login flow
- [`infra/`](infra/) — Terraform for the AWS resources (Lambda, DynamoDB,
  Secrets Manager, IAM)
- [`scripts/build_lambda.sh`](scripts/build_lambda.sh) — builds the zipped
  Lambda deployment package

## Status

Deployed. The client registered in `src/config/clients.ts` (Claude) and
the resources in `src/config/resources.ts` (Porto, victoria) are live.
The issuer domain (DESIGN §8) is still open — Lasso runs on its raw
Lambda Function URL for now.

## Requirements

- Node.js 22+
- [`pre-commit`](https://pre-commit.com/) — run `pre-commit install` once;
  hooks cover biome, yamllint, and terraform fmt/validate

## Local development

```bash
npm install
npm run dev
```

## Deploy

```bash
scripts/build_lambda.sh
cd infra
terraform init
terraform apply
```
