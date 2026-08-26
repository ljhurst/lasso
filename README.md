# Lasso

Luke's Anytime SSO — a single, self-hosted OAuth 2.1 / OIDC authorization
server for all personal projects: one identity, one login, correctly
audience-scoped tokens per app. Built on
[`oidc-provider`](https://github.com/panva/node-oidc-provider). See
[`docs/DESIGN.md`](docs/DESIGN.md) for the full design.

## Table of Contents

- [Repo Structure](#repo-structure)
- [Features](#features)
- [Usage](#usage)
- [Requirements](#requirements)
- [Local Development](#local-development)
- [Deploy](#deploy)

## Repo Structure

- [`docs/`](docs/) — Technical documentation
- [`src/`](src/) — the Node/TypeScript Lambda service
- [`infra/`](infra/) — Terraform for the AWS resources (Lambda, DynamoDB,
  Secrets Manager, IAM)
- [`scripts/`](scripts/) - Build and bootstrap helpers

## Features

- OIDC implementation for OAuth SSO needs
- Admin portal to view clients, resources, and users

## Usage

View the portal

```text
https://zzspanxrc7v4tvou4acvdq36oi0yjdrz.lambda-url.us-east-1.on.aws/
```

Agents can use the skills for

- [Registering a resource server](.claude/skills/lasso-connect-resource/)
- [Registering a client](.claude/skills/lasso-connect-client/)

## Requirements

- [fnm](https://github.com/schniz/fnm) - Manage node versions
- [`pre-commit`](https://pre-commit.com/) — Run `uvx pre-commit install` once; hooks cover biome, yamllint, and terraform fmt/validate
- [`awscli`](https://aws.amazon.com/cli/) - Run AWS commands
- [`terraform`](https://developer.hashicorp.com/terraform/install) - Manage infrastructure

## Local Development

Set the environment

```bash
cp .env.example .env
. .env
```

Install node

```bash
fnm install
fnm use
```

Install dependencies

```bash
npm install
```

Run the dev server

```bash
npm run dev
```

## Deploy

We use Lambda zip + [Terraform](https://developer.hashicorp.com/terraform) to manage infra. First create the Lambda src zip

```bash
scripts/build_lambda.sh
```

Log in via AWS SSO and assume the `lasso-deploy` role

```bash
aws sso login --profile victoria-deploy
```

Set the AWS profile

```bash
export AWS_PROFILE=lasso-deploy
```

Then from `infra/`

```bash
terraform plan
```

And

```bash
terraform apply
```
