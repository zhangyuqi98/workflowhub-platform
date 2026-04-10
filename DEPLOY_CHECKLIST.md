# WorkflowHub Deploy Checklist

## Before build

- set `DATABASE_URL`
- set `WORKFLOWHUB_BASE_URL`
- set `WORKFLOWHUB_SESSION_SECRET`
- set `WORKFLOWHUB_APP_VERSION`
- set `WORKFLOWHUB_RELEASE_SHA`
- set `WORKFLOWHUB_RATE_LIMIT_STORE`
- set `WORKFLOWHUB_ERROR_WEBHOOK_URL` if you want external alerting
- configure either GitHub OAuth or `WORKFLOWHUB_PUBLISH_TOKEN`

## Before public launch

- verify `GET /api/health`
- verify `GET /api/ready`
- verify `GET /api/version`
- verify rate limiting works with your chosen store
- verify OAuth callback URL matches the public domain
- verify workflow mutations create audit log entries
- verify your external error webhook receives test failures if configured
- verify privacy and terms pages are reachable
- verify HTTPS is enabled at the edge

## After deploy

- confirm the homepage loads
- confirm discover works against production data
- confirm publish is locked behind your chosen auth mode
- confirm audit logs are queryable by operators
- confirm logs include `requestId`, `version`, and `release`
