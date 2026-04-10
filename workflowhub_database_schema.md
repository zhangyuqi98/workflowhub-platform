# WorkflowHub Database Schema

## 1. Schema Goal

Define the minimum relational model for a public workflow registry with versioning, installs, and moderation.

Recommended database:

- Postgres

## 2. Main Entities

- users
- workflows
- workflow_versions
- workflow_assets
- tags
- workflow_tags
- installs
- favorites
- reports

## 3. Tables

### 3.1 `users`

```sql
create table users (
  id uuid primary key,
  github_id text unique,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.2 `workflows`

One logical workflow listing.

```sql
create table workflows (
  id uuid primary key,
  author_id uuid not null references users(id),
  slug text unique not null,
  name text not null,
  summary text not null,
  description text,
  visibility text not null default 'public',
  moderation_state text not null default 'active',
  latest_version_id uuid,
  latest_version text,
  install_count integer not null default 0,
  favorite_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.3 `workflow_versions`

Immutable published versions.

```sql
create table workflow_versions (
  id uuid primary key,
  workflow_id uuid not null references workflows(id),
  version text not null,
  changelog text,
  manifest_json jsonb not null,
  workflow_json jsonb not null,
  runtime_compatibility jsonb,
  required_tools jsonb,
  manifest_blob_url text,
  bundle_blob_url text,
  published_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique(workflow_id, version)
);
```

### 3.4 `workflow_assets`

Screenshots or supplemental assets.

```sql
create table workflow_assets (
  id uuid primary key,
  workflow_version_id uuid not null references workflow_versions(id),
  asset_type text not null,
  storage_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
```

### 3.5 `tags`

```sql
create table tags (
  id uuid primary key,
  slug text unique not null,
  label text not null
);
```

### 3.6 `workflow_tags`

```sql
create table workflow_tags (
  workflow_id uuid not null references workflows(id),
  tag_id uuid not null references tags(id),
  primary key (workflow_id, tag_id)
);
```

### 3.7 `installs`

Track installs for analytics.

```sql
create table installs (
  id uuid primary key,
  workflow_id uuid not null references workflows(id),
  workflow_version_id uuid references workflow_versions(id),
  installed_by uuid references users(id),
  runtime_family text,
  install_source text,
  created_at timestamptz not null default now()
);
```

### 3.8 `favorites`

```sql
create table favorites (
  user_id uuid not null references users(id),
  workflow_id uuid not null references workflows(id),
  created_at timestamptz not null default now(),
  primary key (user_id, workflow_id)
);
```

### 3.9 `reports`

```sql
create table reports (
  id uuid primary key,
  workflow_id uuid not null references workflows(id),
  workflow_version_id uuid references workflow_versions(id),
  reporter_id uuid references users(id),
  reason text not null,
  details text,
  status text not null default 'open',
  reviewer_id uuid references users(id),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 4. Recommended Enums

Use check constraints or enum tables for:

- user role
- workflow visibility
- moderation state
- report status
- asset type

Suggested values:

### `users.role`

- `user`
- `moderator`
- `admin`

### `workflows.visibility`

- `public`
- `unlisted`
- `private`

### `workflows.moderation_state`

- `active`
- `limited`
- `hidden`
- `removed`

### `reports.status`

- `open`
- `reviewing`
- `resolved`
- `dismissed`

## 5. Index Recommendations

```sql
create index idx_workflows_author_id on workflows(author_id);
create index idx_workflows_latest_version_id on workflows(latest_version_id);
create index idx_workflow_versions_workflow_id on workflow_versions(workflow_id);
create index idx_installs_workflow_id on installs(workflow_id);
create index idx_reports_workflow_id on reports(workflow_id);
create index idx_reports_status on reports(status);
```

For search:

```sql
create index idx_workflows_search on workflows
using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(summary,'')));
```

## 6. Data Rules

- `workflows.latest_version_id` must point to one row in `workflow_versions`
- `workflow_versions` must be immutable after publish except for moderation metadata
- deleting workflows should usually soft-delete via `visibility` or `moderation_state`
- tags should be normalized into a separate table

## 7. Suggested Read Models

For frontend efficiency, consider materialized or denormalized views later.

Examples:

- `workflow_search_view`
- `author_profile_view`
- `workflow_detail_view`

## 8. V1 Query Patterns

The schema should support:

- list latest public workflows
- search by text and tag
- load workflow detail with latest version
- load all versions for a workflow
- load workflows by author
- record installs and favorites
- review reports

## 9. Migration Advice

Since your current project is local-file-first:

1. keep the workflow JSON shape as the canonical publish artifact
2. store a copy of published JSON in `workflow_versions.workflow_json`
3. derive listing metadata into normalized tables
4. treat platform metadata as wrapper data, not replacement data
