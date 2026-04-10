# WorkflowHub Deployment Guide

This document describes the current lightweight production deployment path for WorkflowHub.

## Architecture

Current deployment target:

- one `workflowhub` web instance
- one Postgres database
- optional seeded demo data on first boot
- GitHub OAuth publisher login, with token fallback for low-friction beta deployments

This is intentionally lightweight and suitable for:

- private beta
- early public testing
- single-instance launch

## Required Environment Variables

Minimum:

- `DATABASE_URL`
- `WORKFLOWHUB_BASE_URL`

Recommended for any public deployment:

- `WORKFLOWHUB_SESSION_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Optional fallback:

- `WORKFLOWHUB_PUBLISH_TOKEN`

Optional:

- `WORKFLOWHUB_SEED_ON_BOOT=true`
- `WORKFLOWHUB_SKIP_DB_DURING_BUILD=true` for CI and image builds
- `WORKFLOWHUB_APP_VERSION`
- `WORKFLOWHUB_RELEASE_SHA`

## Local Container Deploy

```bash
docker compose up --build
```

Services:

- `postgres`
- `workflowhub`

Additional deployment templates:

- `deploy/docker-compose.staging.yml`
- `deploy/docker-compose.production.yml`
- `deploy/Caddyfile`

The app container runs:

0. `node ./bin/check-env.mjs`
1. `prisma migrate deploy`
2. optional seed
3. `npm run start`

## Health Check

Use:

```bash
curl http://127.0.0.1:3001/api/health
```

Expected result:

- `status: ok`
- `database: reachable`

Readiness endpoint:

```bash
curl http://127.0.0.1:3001/api/ready
```

Version endpoint:

```bash
curl http://127.0.0.1:3001/api/version
```

## Publisher Access

Auth modes:

- preferred: GitHub OAuth via `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- fallback: token-based publisher access via `WORKFLOWHUB_PUBLISH_TOKEN`

If publisher protection is configured:

- publish/edit/delete are protected
- dashboard mutating actions are hidden until unlocked
- publisher session is established via secure cookie

Session endpoint:

- `GET /api/publisher-session`
- `POST /api/publisher-session`
- `DELETE /api/publisher-session`

## Current Production Safeguards

- GitHub OAuth publisher sessions with signed cookies
- token fallback for lightweight beta access
- in-memory rate limiting on:
  - publisher session unlock
  - workflow mutations
- persistent audit logs for login, logout, publish, edit, version, and delete actions
- explicit startup environment validation
- secure response headers via Next middleware
- per-request trace IDs via `X-Request-Id`
- baseline privacy and terms pages
- health check endpoint
- readiness endpoint
- version endpoint
- migration-based startup
- CI workflow for typecheck and build

## Current Limitations

This deployment is not yet a full multi-tenant production stack.

Known gaps:

- in-memory rate limiting only
- no background jobs
- no external monitoring integration
- no managed object storage
- no CDN
- no managed secret storage or key rotation

## Recommended Next Upgrades

1. managed Postgres
2. external error monitoring
3. reverse proxy / TLS / domain setup
4. managed rate limiting and abuse protection
5. richer moderation and policy workflows

## Suggested Release Topology

For staging:

- use `deploy/docker-compose.staging.yml`
- keep Postgres in the same stack
- use a staging GitHub OAuth app and a staging base URL

For production:

- use `deploy/docker-compose.production.yml`
- point `DATABASE_URL` at a managed Postgres instance
- terminate HTTPS via Caddy or an external load balancer
- set `WORKFLOWHUB_RELEASE_SHA` during each deploy
