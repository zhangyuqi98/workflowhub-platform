# WorkflowHub Information Architecture

## 1. IA Goal

Design the minimum public platform structure for discovering, inspecting, publishing, and installing workflows.

## 2. Primary Navigation

Top-level navigation for V1:

- Home
- Discover
- Publish
- My Workflows
- Docs
- Sign In / Profile

## 3. Core Page Map

```text
Home
Discover
  ├── Search Results
  ├── Tag / Category Pages
  └── Featured Collections
Workflow Detail
  ├── Overview
  ├── Versions
  ├── Installation
  ├── Changelog
  └── Report
Author Profile
Publish
  ├── New Workflow
  ├── Edit Metadata
  ├── Upload Version
  └── Publish Review
My Workflows
  ├── Drafts
  ├── Published
  └── Reported / Moderation States
Docs
```

## 4. Homepage Structure

Homepage should answer:

- what WorkflowHub is
- what kinds of workflows exist
- where to start

Recommended sections:

- hero
- search bar
- featured workflows
- popular tags
- latest workflows
- install and publish explainer

## 5. Discover Page

The discover page is the main retrieval surface.

Needs:

- search input
- filters
- sort
- result cards

Recommended filters:

- tags
- runtime
- tool requirements
- license
- updated date

Recommended sorts:

- relevant
- newest
- most installed
- most favorited

## 6. Workflow Detail Page

This is the most important page in the system.

### Must-have sections

- name
- summary
- author
- install CTA
- compatibility
- tags
- version
- steps preview
- tool requirements
- license
- updated time

### Trust sections

- version history
- source / artifact links
- moderation or safety status
- report button

### Optional later

- ratings
- comments
- examples

## 7. Publish Flow IA

The publish flow should feel like structured form submission, not a generic file upload.

Recommended steps:

1. Basic metadata
2. Workflow content
3. Compatibility and tools
4. Assets and docs
5. Review and publish

## 8. My Workflows Dashboard

The dashboard should help creators manage lifecycle states.

Views:

- drafts
- published workflows
- latest version status
- moderation issues
- install counts

## 9. Author Profile Page

Should show:

- display name
- bio
- avatar
- published workflows
- tags they are known for

## 10. Installation Experience

The install block on detail pages should be simple and prominent.

Suggested layout:

- primary install command
- version selector
- compatible runtimes
- manual download fallback

## 11. Search Result Card Design

Each card should show:

- name
- short summary
- author
- top tags
- runtime badges
- latest version
- updated date

## 12. Moderation IA

Users:

- can report a workflow

Moderators:

- can review report queue
- can inspect reported versions
- can hide listings
- can leave moderation notes

## 13. Core User Flows

### 13.1 Consumer Flow

```text
Home
  -> Search or browse
  -> Workflow detail page
  -> Inspect trust and compatibility
  -> Install workflow
```

### 13.2 Creator Flow

```text
Sign in
  -> Publish
  -> Fill metadata
  -> Upload workflow version
  -> Review
  -> Publish
  -> Share detail page
```

### 13.3 Maintainer Flow

```text
Moderation queue
  -> Open report
  -> Inspect workflow version
  -> Apply action
```

## 14. Recommended V1 Sitemap

```text
/
/discover
/discover?tag=...
/workflows/:slug
/workflows/:slug/versions
/users/:username
/publish
/dashboard
/docs
```

## 15. Mobile IA Notes

V1 should be desktop-first, but mobile-safe.

Key rules:

- search remains primary entry point
- install block should collapse cleanly
- workflow steps preview should not dominate the screen
- metadata should stack vertically

## 16. Future IA Extensions

Later additions can include:

- collections
- organization spaces
- curated packs
- verified publishers
- analytics views
