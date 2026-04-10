import type { WorkflowListing } from "@schema/types";

export const featuredWorkflows: WorkflowListing[] = [
  {
    slug: "pr-review-risk-first",
    name: "PR Review: Risk-First",
    summary: "Review pull requests by prioritizing regressions, coupling, and missing tests.",
    description:
      "A structured review workflow for engineers who want findings first, then gaps, then a short conclusion. Optimized for GitHub-heavy code review loops.",
    author: {
      username: "linjie",
      displayName: "Linjie Wu",
    },
    tags: ["engineering", "review", "github"],
    keywords: ["pr", "review", "regression", "tests"],
    runtimeFamilies: ["openclaw", "codex"],
    requiredTools: ["github", "git"],
    installCount: 1842,
    favoriteCount: 312,
    latestVersion: "1.4.0",
    updatedAt: "2026-03-28",
    license: "MIT",
    steps: [
      {
        id: "step-1",
        title: "Load review context",
        instruction: "Fetch changed files, linked discussion, and recent review comments.",
        tool: "github",
      },
      {
        id: "step-2",
        title: "Find risky behavior changes",
        instruction: "Prioritize regressions, hidden coupling, and migration risk.",
        tool: "git",
      },
      {
        id: "step-3",
        title: "Draft findings first",
        instruction: "Produce findings before summary, with missing-test notes where relevant.",
      },
    ],
    versions: [
      {
        version: "1.4.0",
        publishedAt: "2026-03-28",
        changelog: "Refined missing-test guidance and updated GitHub compatibility metadata.",
      },
      {
        version: "1.3.0",
        publishedAt: "2026-02-12",
        changelog: "Improved regression scoring language.",
      },
    ],
  },
  {
    slug: "us-market-close-recap",
    name: "US Market Close Recap",
    summary: "Recap US market performance with sector rotation, catalysts, and next-day watchlist.",
    description:
      "A finance workflow for end-of-day recap. Useful for traders, analysts, and newsletter operators who need repeatable market close structure.",
    author: {
      username: "mei",
      displayName: "Mei Zhang",
    },
    tags: ["finance", "markets", "analysis"],
    keywords: ["market", "close", "sector", "watchlist"],
    runtimeFamilies: ["openclaw", "generic"],
    requiredTools: ["browser", "terminal"],
    installCount: 928,
    favoriteCount: 201,
    latestVersion: "0.9.2",
    updatedAt: "2026-03-19",
    license: "Apache-2.0",
    steps: [
      {
        id: "step-1",
        title: "Review index action",
        instruction: "Summarize SPY, QQQ, and IWM behavior with notable breadth signals.",
        tool: "browser",
      },
      {
        id: "step-2",
        title: "Check sector rotation",
        instruction: "Identify leadership, laggards, and notable relative strength rotation.",
        tool: "browser",
      },
      {
        id: "step-3",
        title: "Build next-day watchlist",
        instruction: "Extract catalysts, earnings, macro events, and setup candidates.",
        tool: "terminal",
      },
    ],
    versions: [
      {
        version: "0.9.2",
        publishedAt: "2026-03-19",
        changelog: "Updated market structure checklist and simplified watchlist output.",
      },
    ],
  },
  {
    slug: "launch-checklist-ai-feature",
    name: "AI Feature Launch Checklist",
    summary: "Coordinate launch readiness for a new AI-facing product feature.",
    description:
      "Cross-functional workflow spanning engineering, product, docs, trust, and analytics before a feature launch goes public.",
    author: {
      username: "rachelpm",
      displayName: "Rachel Pan",
    },
    tags: ["product", "launch", "operations"],
    keywords: ["launch", "ai", "checklist", "release"],
    runtimeFamilies: ["codex", "generic"],
    requiredTools: ["docs", "github", "notion"],
    installCount: 611,
    favoriteCount: 146,
    latestVersion: "2.1.0",
    updatedAt: "2026-03-30",
    license: "MIT",
    steps: [
      {
        id: "step-1",
        title: "Validate scope and release status",
        instruction: "Confirm feature flag state, rollout plan, and launch owner.",
      },
      {
        id: "step-2",
        title: "Check risk gates",
        instruction: "Review quality, analytics, docs, and trust readiness before launch.",
      },
      {
        id: "step-3",
        title: "Publish launch brief",
        instruction: "Generate a concise go-live brief with open risks and contingency plan.",
      },
    ],
    versions: [
      {
        version: "2.1.0",
        publishedAt: "2026-03-30",
        changelog: "Expanded trust and analytics readiness checks.",
      },
    ],
  },
];

export const workflowMap = new Map(featuredWorkflows.map((workflow) => [workflow.slug, workflow]));

export const topTags = [
  "engineering",
  "github",
  "finance",
  "analysis",
  "product",
  "operations",
  "research",
  "content",
];
