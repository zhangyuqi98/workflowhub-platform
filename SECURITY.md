# Security Policy

WorkflowHub is still in active development. This document describes the current security expectations for operators and contributors.

## Reporting a Vulnerability

Do not open a public issue for sensitive vulnerabilities.

Instead:

- contact the repository owner privately
- include clear reproduction steps
- include impact, affected routes, and any required environment assumptions

## Current Security Posture

The platform currently includes:

- signed publisher sessions
- GitHub OAuth support with token fallback
- mutation audit logs
- basic in-memory rate limiting
- security response headers via middleware

## Known Gaps

The following areas are not yet fully production-grade:

- distributed rate limiting
- external secret management
- automated dependency scanning
- external error monitoring
- moderation workflows for abusive content

## Operator Guidance

Before launching a public instance, operators should:

- use a managed Postgres instance
- set a strong `WORKFLOWHUB_SESSION_SECRET`
- prefer GitHub OAuth over open publishing
- place WorkflowHub behind HTTPS
- add external monitoring and alerting
