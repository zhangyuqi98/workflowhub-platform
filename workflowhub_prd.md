# WorkflowHub PRD

## 1. Product Summary

WorkflowHub is a public platform for discovering, publishing, versioning, installing, and reusing agent workflows.

The first version is not a cloud workflow runner.
It is a registry and editing platform with local-first execution.

Users should be able to:

- publish their own reusable workflows
- browse workflows created by others
- inspect workflow structure before trusting it
- install workflows into local agent environments
- update installed workflows when new versions are released

## 2. Problem Statement

Today, reusable workflows mostly live in:

- private notes
- local JSON files
- prompt snippets
- scattered GitHub repos

This creates several problems:

- good workflows are hard to discover
- repeated tasks are hard to standardize
- users cannot easily compare or trust workflow quality
- installing a workflow into a runtime is usually manual
- workflows have poor versioning, attribution, and collaboration

WorkflowHub solves this by turning workflows into a shareable, versioned, inspectable artifact.

## 3. Product Goal

Build the public workflow registry layer for agent ecosystems.

The product should help users answer four questions:

1. What workflows already exist for this task?
2. Can I trust this workflow enough to install it?
3. How do I install it into my local agent environment?
4. How do I publish my own workflow and improve it over time?

## 4. Non-Goals For V1

WorkflowHub V1 should not include:

- cloud execution of workflows
- hosted secrets management
- team enterprise permissions
- drag-and-drop workflow builders
- monetization or payments
- real-time multi-user collaboration
- complex marketplace economics

## 5. Target Users

### 5.1 Workflow Authors

People who create useful repeated processes and want to publish them.

Examples:

- power users of Codex or OpenClaw
- developer advocates
- internal tooling engineers
- prompt / workflow tinkerers

### 5.2 Workflow Consumers

People who want to install and reuse workflows created by others.

Examples:

- developers
- operators
- analysts
- content teams
- AI-heavy individual users

### 5.3 Platform Maintainers

The team responsible for moderation, quality, trust, taxonomy, and compatibility.

## 6. Product Principles

### 6.1 Local-First Execution

Execution happens in the user's environment whenever possible.
The platform distributes workflows rather than becoming the default runner.

### 6.2 Files Are Inspectable

A workflow must be reviewable as structured data, not hidden inside a black-box prompt.

### 6.3 Versioned By Default

Every published workflow should have version history and a clear latest release.

### 6.4 Trust Before Virality

Discovery matters, but trust matters more.
Every workflow page should clearly expose author, version, compatibility, and risk signals.

### 6.5 Fast Install Path

The gap between "I found a useful workflow" and "it is available in my agent" should be minimal.

## 7. Core User Stories

### 7.1 Discover

As a user, I can search for workflows by task, keyword, tag, runtime, and tool so I can find something relevant quickly.

### 7.2 Inspect

As a user, I can open a workflow detail page and inspect summary, steps, tags, tool requirements, versions, license, and author before I install it.

### 7.3 Install

As a user, I can install a workflow into my local environment through a simple CLI or copy/install action.

### 7.4 Publish

As an author, I can publish a workflow with metadata, version, description, and compatibility details.

### 7.5 Update

As an author, I can release a new version of an existing workflow without breaking the install path for existing users.

### 7.6 Moderate

As a platform maintainer, I can review reports, hide unsafe workflows, and preserve auditability.

## 8. V1 Scope

### 8.1 Public Registry

- public homepage
- search
- category / tag browsing
- workflow detail page
- author page

### 8.2 Publish System

- sign in with GitHub
- create workflow draft
- upload or author workflow manifest
- publish versioned release
- edit listing metadata

### 8.3 Installation

- install instructions on each workflow page
- CLI-based install path
- local artifact download
- update command for latest version

### 8.4 Trust & Safety

- report workflow
- visible author identity
- visible version history
- visible compatibility metadata
- basic automated checks on manifest shape

## 9. V1 Success Metrics

### 9.1 Supply Metrics

- number of published workflows
- number of unique publishing authors
- percentage of workflows with multiple versions

### 9.2 Demand Metrics

- search to detail-view conversion
- install rate from workflow detail pages
- returning installers

### 9.3 Quality Metrics

- report rate
- install failure rate
- percentage of workflows with complete metadata

## 10. Workflow Artifact Definition

For platform purposes, a workflow is a versioned artifact composed of:

- manifest metadata
- execution steps
- matching metadata
- compatibility metadata
- optional assets or examples

The platform should treat workflow data as a bundle, even if the first implementation stores only one JSON file per version.

## 11. Marketplace Metadata Required For Publish

V1 publish form should require:

- name
- slug
- summary
- long description
- tags
- keywords
- steps
- required tools
- compatible runtimes
- license
- visibility

Optional but recommended:

- screenshots
- examples
- changelog notes
- source repo

## 12. Trust & Safety Requirements

Every public workflow should support:

- reporting unsafe content
- moderation state
- hidden / removed visibility states
- version-level auditability
- author attribution

The workflow file should be visible or downloadable so users can inspect what they are installing.

## 13. Recommended Phased Rollout

### Phase 1: Registry MVP

- search
- workflow pages
- publish
- versioning
- install docs

### Phase 2: Install + Sync

- official CLI
- install / update / remove workflow
- local registry sync
- runtime compatibility verification

### Phase 3: Community

- likes / favorites
- featured workflows
- quality badges
- richer moderation tooling

### Phase 4: Ecosystem

- organization spaces
- workflow collections
- verified publishers
- analytics dashboards

## 14. What Existing Local WorkflowHub Assets Can Be Reused

The current local project already contains reusable building blocks:

- workflow JSON schema
- workflow editing logic
- local UI patterns
- matching and rendering logic
- runtime-oriented workflow documentation

These should become source material for the platform, but not the final platform architecture itself.

## 15. Open Product Questions

- Should one workflow version be a single JSON file or a directory bundle?
- Should installs always point to `latest`, or should users pin versions by default?
- Should runtime compatibility be free-form or enumerated?
- Should screenshots be optional in V1?
- Should "fork workflow" exist in V1 or wait until Phase 2?

## 16. Proposed V1 Definition

WorkflowHub V1 is:

"A public registry and editor for reusable agent workflows, with local-first execution, versioned publishing, and simple installation into local runtimes."
