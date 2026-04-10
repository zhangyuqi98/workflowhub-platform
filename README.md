# WorkflowHub Platform

WorkflowHub Platform is the Phase 1 implementation workspace for the public WorkflowHub registry.

It is no longer treated as a local-only workflow skill package.
This repository is where the public platform layer starts:

- workflow discovery
- workflow detail pages
- publishing flow design
- install flow design
- platform schema and data model
- publisher access protection
- deployment and health-check foundations

## Current State

The repository now includes:

- platform planning docs
- a Phase 1 web skeleton under `apps/web`
- shared workflow listing types under `packages/workflow-schema`
- a registry access layer in `apps/web/lib/registry.ts`
- API routes for workflows, tags, and author profiles under `apps/web/app/api`
- install APIs and a minimal local CLI for install / list / update flows
- publisher session protection for mutating actions
- GitHub OAuth support for publisher identity
- persistent audit logs for auth and workflow mutations
- health checks and container deploy files
- security headers, robots, sitemap, and legal placeholder pages
- CI workflow for typecheck and build

## Key Documents

- [workflowhub_prd.md](./workflowhub_prd.md)
- [workflowhub_technical_spec.md](./workflowhub_technical_spec.md)
- [workflowhub_information_architecture.md](./workflowhub_information_architecture.md)
- [workflowhub_database_schema.md](./workflowhub_database_schema.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [SECURITY.md](./SECURITY.md)
- [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)

## Phase 1 Build Goal

Phase 1 is the public registry MVP, not a cloud execution engine.

The first implementation should focus on:

- homepage
- discover/search
- workflow detail page
- publish flow shell
- author profile page
- platform data model

## Implemented In This Snapshot

- homepage backed by registry helper functions
- discover page with query-string search and filtering
- workflow detail page wired to registry lookup
- author profile page wired to registry lookup
- publish page with a working MVP form and workflow creation API
- API routes for:
  - `GET /api/workflows`
  - `GET /api/workflows/[slug]`
  - `GET /api/tags`
  - `GET /api/users/[username]`
- `GET /api/health`
  - `GET /api/ready`
  - `GET /api/version`
  - `GET /api/audit`
  - `GET /api/publisher-session`
  - `POST /api/workflows`
  - `POST /api/publisher-session`
  - `PUT /api/workflows/[slug]`
  - `PATCH /api/workflows/[slug]`
  - `DELETE /api/workflows/[slug]`
  - `GET /api/install/[slug]`
  - `GET /api/install/[slug]/[version]`
  - `POST /api/install/[slug]/[version]`
- a minimal CLI:
  - `workflowhub install <slug>`
  - `workflowhub inspect <slug>`
  - `workflowhub list`
  - `workflowhub remove <slug>`
  - `workflowhub update <slug>`
  - `workflowhub update --all`

## Frontend Skeleton

The web app lives in `apps/web`.

Suggested local commands after installing dependencies:

```bash
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Environment

Copy `.env.example` to `.env` before running or deploying.

Important variables:

- `DATABASE_URL`
- `WORKFLOWHUB_BASE_URL`
- `WORKFLOWHUB_PUBLISH_TOKEN`
- `WORKFLOWHUB_SESSION_SECRET`
- `WORKFLOWHUB_SEED_ON_BOOT`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `WORKFLOWHUB_SKIP_DB_DURING_BUILD`
- `WORKFLOWHUB_APP_VERSION`
- `WORKFLOWHUB_RELEASE_SHA`
- `WORKFLOWHUB_RATE_LIMIT_STORE`
- `WORKFLOWHUB_ERROR_WEBHOOK_URL`

Publisher access modes:

- if `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set, WorkflowHub uses GitHub sign-in for publisher access
- otherwise, if `WORKFLOWHUB_PUBLISH_TOKEN` is set, WorkflowHub uses token-based publisher access
- otherwise, publisher mutations are open

The publish page and publisher dashboard automatically reflect the configured auth mode.

## Deploy

This repo now includes:

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `deploy/docker-compose.staging.yml`
- `deploy/docker-compose.production.yml`
- `deploy/Caddyfile`
- `.github/workflows/docker-publish.yml`
- `release/RELEASE.md`
- `release/workflowhub.service.example`
- `release/nginx.workflowhub.conf.example`
- `bin/docker-start.sh`
- `bin/check-env.mjs`
- `prisma.config.ts`

Quick start:

```bash
docker compose up --build
```

The deployment path now targets Postgres by default.
The container boot path runs `prisma migrate deploy` automatically before starting the web app.
The container also validates required environment variables before boot.
For a first demo deployment, you can set `WORKFLOWHUB_SEED_ON_BOOT=true`.
The build script now sets `WORKFLOWHUB_SKIP_DB_DURING_BUILD=true` so CI and image builds do not require a live database connection.

Health endpoint:

```bash
curl http://127.0.0.1:3001/api/health
```

Readiness endpoint:

```bash
curl http://127.0.0.1:3001/api/ready
```

Version endpoint:

```bash
curl http://127.0.0.1:3001/api/version
```

Recent audit events for operators:

```bash
curl http://127.0.0.1:3001/api/audit
```

Error reporting:

- if `WORKFLOWHUB_ERROR_WEBHOOK_URL` is configured, server-side failures are mirrored to that external webhook

Rate limiting:

- `WORKFLOWHUB_RATE_LIMIT_STORE=database` uses Postgres-backed rate limiting
- `WORKFLOWHUB_RATE_LIMIT_STORE=memory` falls back to process memory for local development

Container publishing:

- a GHCR image publish workflow now lives in `.github/workflows/docker-publish.yml`

## CLI Quick Start

Run the CLI directly from this repo:

```bash
npm run cli -- install pr-review-risk-first --base-url http://127.0.0.1:3001
npm run cli -- inspect pr-review-risk-first --base-url http://127.0.0.1:3001
npm run cli -- list
npm run cli -- remove pr-review-risk-first
npm run cli -- update --all --base-url http://127.0.0.1:3001
```

Default install location:

- `$WORKFLOWHUB_INSTALL_DIR`
- otherwise `$CODEX_HOME/workflowhub/workflows`
- otherwise `~/.workflowhub/workflows`

Each install writes:

- `<slug>.json` into the workflow directory
- manifest / README / receipt files under `.workflowhub/installs/<slug>/`

The root scripts now start the app from `apps/web`, which avoids the `.next` asset resolution problems we hit when using `next ... apps/web` from the repository root.

## Notes

- The registry now reads through Prisma-backed helpers in `apps/web/lib/registry.ts`.
- Local development and deployment now target Postgres via `prisma/schema.prisma`.
- The current setup is suitable for a lightweight single-instance launch or private beta.
- The publish path now supports GitHub OAuth, token fallback, persistent audit logs, and CI build verification.
- The deployment path now includes startup env validation, a non-root multi-stage Docker image, and explicit readiness checks.
- Requests now carry `X-Request-Id`, and health/readiness/version responses expose release metadata for debugging.
- The platform now includes a lightweight staging/production deployment pack, database-backed rate limiting, and optional external error-webhook reporting.
- The next production upgrades after this are full third-party monitoring, managed secret storage, and richer multi-tenant moderation workflows.
