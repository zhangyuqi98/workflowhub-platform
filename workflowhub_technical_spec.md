# WorkflowHub Technical Spec

## 1. System Goal

WorkflowHub should provide the infrastructure needed to publish, store, version, search, inspect, and install workflows.

It should not be coupled to one local skill implementation.
Instead, it should expose a platform layer that can serve multiple runtimes.

## 2. System Boundaries

### In Scope

- public web application
- API for workflow metadata and versions
- artifact storage for workflow bundles
- auth and publisher identity
- install / update interfaces
- moderation and reporting primitives

### Out of Scope For V1

- hosted execution engine
- hosted secret storage
- remote sandbox execution
- multi-tenant job runner

## 3. High-Level Architecture

```text
Users
  |
  v
Web App (frontend)
  |
  v
Application API
  |--- Postgres
  |--- Object Storage
  |--- Search Index (optional in V1)
  |--- Background Jobs
  |
  v
CLI / Runtime Adapters
```

## 4. Main Components

### 4.1 Web Frontend

Responsibilities:

- homepage
- search and browse
- workflow detail pages
- author pages
- publish and edit flows
- moderation-facing UI

Suggested stack:

- Next.js
- TypeScript
- Tailwind or CSS modules

### 4.2 API Layer

Responsibilities:

- auth
- workflow CRUD
- workflow version publishing
- listing and search endpoints
- install metadata
- reporting and moderation

Suggested stack:

- Next.js API routes for speed, or
- NestJS / FastAPI if you want a separate backend

### 4.3 Database

Recommended:

- Postgres

Stores:

- users
- workflows
- workflow_versions
- tags
- installs
- reports

### 4.4 Object Storage

Recommended:

- S3 or R2

Stores:

- workflow JSON bundles
- screenshots
- optional example assets

### 4.5 Search

V1 can start with:

- Postgres full-text search

Later:

- Meilisearch or OpenSearch

### 4.6 Background Jobs

Needed for:

- metadata extraction
- schema validation
- moderation checks
- image processing
- usage aggregation

## 5. Workflow Artifact Model

The system should treat each published workflow version as an immutable artifact.

Recommended shape:

```text
workflow/
  manifest.json
  workflow.json
  README.md
  assets/
```

V1 shortcut:

- allow single-file JSON publish
- internally wrap it as a versioned bundle

## 6. Manifest Requirements

Each published version should include:

- `slug`
- `name`
- `summary`
- `description`
- `version`
- `keywords`
- `tags`
- `steps`
- `tool_requirements`
- `runtime_compatibility`
- `license`
- `author`

Optional:

- screenshots
- examples
- changelog
- source repository URL

## 7. Key Flows

### 7.1 Publish Flow

```text
Author signs in
  -> Creates or edits workflow draft
  -> Uploads manifest / workflow bundle
  -> Platform validates schema
  -> Platform stores artifact
  -> Platform creates immutable workflow version
  -> Workflow latest pointer updates
```

### 7.2 Install Flow

```text
User opens workflow detail page
  -> Clicks install / copies command
  -> CLI fetches manifest and artifact URL
  -> CLI downloads selected version
  -> CLI writes to local workflow directory
  -> CLI records install source and version
```

### 7.3 Update Flow

```text
Local CLI checks installed versions
  -> Queries WorkflowHub API
  -> Detects newer compatible version
  -> Prompts user or auto-updates based on flag
```

### 7.4 Moderation Flow

```text
User submits report
  -> Report record created
  -> Moderator reviews workflow version
  -> Version or listing can be hidden / restricted / removed
```

## 8. Recommended API Surface

### Public

- `GET /api/workflows`
- `GET /api/workflows/:slug`
- `GET /api/workflows/:slug/versions`
- `GET /api/users/:username`
- `GET /api/tags`
- `GET /api/search?q=...`

### Authenticated

- `POST /api/workflows`
- `PATCH /api/workflows/:slug`
- `POST /api/workflows/:slug/versions`
- `POST /api/workflows/:slug/report`
- `POST /api/workflows/:slug/favorite`

### Install / Runtime

- `GET /api/install/:slug`
- `GET /api/install/:slug/:version`
- `GET /api/compatibility/:slug`

### Moderation

- `GET /api/mod/reports`
- `PATCH /api/mod/reports/:id`
- `PATCH /api/mod/workflows/:slug`
- `PATCH /api/mod/versions/:id`

## 9. Versioning Rules

- every publish creates a new immutable version
- only metadata pointers such as `latest` are mutable
- installs should support both pinned version and latest
- version pages must remain inspectable after new releases

## 10. Identity & Auth

Recommended V1 auth:

- GitHub OAuth

Why:

- low friction
- immediate public identity
- natural fit for technical creators

User profile minimum:

- username
- display name
- avatar
- bio
- linked GitHub profile

## 11. Trust & Safety Layer

V1 must support:

- reporting workflows
- moderation status on listings
- visibility states
- author attribution
- version history visibility
- schema validation before publish

Recommended moderation states:

- `active`
- `limited`
- `hidden`
- `removed`

## 12. Storage Design

### Database

Stores normalized metadata.

### Object Storage

Stores immutable workflow artifact files.

A workflow version record should always point to:

- manifest blob
- optional bundle blob
- optional screenshot assets

## 13. Search Design

Search ranking in V1 can combine:

- exact slug match
- name match
- keyword match
- summary match
- tag match
- popularity boost
- recency boost

## 14. Runtime Compatibility Model

Each workflow should declare compatibility fields such as:

- runtime family
- minimum runtime version
- supported tool adapters
- local-only or cloud-compatible

Example:

```json
{
  "runtime_compatibility": {
    "families": ["openclaw", "codex"],
    "min_version": "1.0.0",
    "install_type": "local",
    "required_tools": ["git", "github"]
  }
}
```

## 15. Suggested Repo Layout For Platform Code

```text
workflowhub_platform/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── workflow-schema/
│   ├── registry-sdk/
│   ├── cli/
│   └── ui-components/
├── docs/
└── infrastructure/
```

## 16. Migration Advice From Current Local Project

Your current local project already contains:

- workflow schema ideas
- editor behavior
- workflow rendering rules
- local file storage assumptions

Recommended migration:

1. extract platform schema into a shared package
2. separate local runtime logic from registry logic
3. move local editor concepts into the web authoring flow
4. replace local filesystem assumptions with artifact storage and DB records

## 17. V1 Technical Risks

- workflow schema drift between local and platform versions
- install friction across different runtimes
- unsafe workflow content
- poor search quality if metadata is weak
- versioning confusion if latest vs pinned is unclear

## 18. Recommended Build Order

1. shared workflow schema package
2. database schema and migrations
3. workflow CRUD APIs
4. public detail page and search page
5. publish flow
6. install CLI
7. moderation/reporting
