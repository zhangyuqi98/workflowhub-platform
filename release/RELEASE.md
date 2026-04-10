# WorkflowHub Release Notes

This directory contains operator-facing release assets for environments that do not deploy directly from a managed platform.

Included:

- `workflowhub.service.example` for systemd-managed hosts
- `nginx.workflowhub.conf.example` for reverse proxy setups

Recommended release flow:

1. build and push the Docker image
2. update `WORKFLOWHUB_RELEASE_SHA`
3. deploy the new image
4. verify `/api/health`, `/api/ready`, and `/api/version`
5. verify publish, edit, and delete flows behind your configured auth mode
