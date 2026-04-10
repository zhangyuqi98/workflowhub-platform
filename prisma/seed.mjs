import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function dedupe(values) {
  return Array.from(
    new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))
  );
}

function buildArtifacts(workflow, version, author) {
  const toolPreferences = dedupe([
    ...workflow.requiredTools,
    ...workflow.steps.map((step) => step.tool),
  ]).map((tool) => ({
    tool,
    purpose: "",
  }));

  return {
    manifestJson: {
      format: "workflowhub-manifest@v1",
      slug: workflow.slug,
      name: workflow.name,
      summary: workflow.summary,
      description: workflow.description,
      publishedVersion: version.version,
      license: workflow.license,
      changelog: version.changelog,
      publishedAt: version.publishedAt,
      author: {
        username: author.username,
        displayName: author.displayName,
      },
      tags: workflow.tags,
      keywords: workflow.keywords,
      runtimeFamilies: workflow.runtimeFamilies,
      requiredTools: workflow.requiredTools,
    },
    workflowJson: {
      id: workflow.slug,
      name: workflow.name,
      summary: workflow.summary,
      match: {
        keywords: workflow.keywords,
      },
      steps: workflow.steps.map((step) => ({
        id: step.stepKey,
        title: step.title,
        instruction: step.instruction,
      })),
      tool_preferences: toolPreferences,
      version: 1,
    },
    readmeMarkdown: [
      `# ${workflow.name}`,
      "",
      workflow.description,
      "",
      `Published version: \`${version.version}\``,
      `License: \`${workflow.license}\``,
      `Compatible runtimes: ${workflow.runtimeFamilies.join(", ")}`,
      "",
      "## Steps",
      "",
      ...workflow.steps.map((step, index) => `${index + 1}. ${step.title}: ${step.instruction}`),
    ].join("\n"),
  };
}

const workflows = [
  {
    slug: "pr-review-risk-first",
    name: "PR Review: Risk-First",
    summary: "Review pull requests by prioritizing regressions, coupling, and missing tests.",
    description:
      "A structured review workflow for engineers who want findings first, then gaps, then a short conclusion. Optimized for GitHub-heavy code review loops.",
    author: {
      username: "linjie",
      displayName: "Linjie Wu",
      bio: "Engineering workflow author focused on code review quality, repeatability, and high-signal delivery.",
    },
    tags: ["engineering", "review", "github"],
    keywords: ["pr", "review", "regression", "tests"],
    runtimeFamilies: ["openclaw", "codex"],
    requiredTools: ["github", "git"],
    installCount: 1842,
    favoriteCount: 312,
    latestVersion: "1.4.0",
    updatedAt: "2026-03-28T00:00:00.000Z",
    license: "MIT",
    steps: [
      {
        stepKey: "step-1",
        title: "Load review context",
        instruction: "Fetch changed files, linked discussion, and recent review comments.",
        tool: "github",
      },
      {
        stepKey: "step-2",
        title: "Find risky behavior changes",
        instruction: "Prioritize regressions, hidden coupling, and migration risk.",
        tool: "git",
      },
      {
        stepKey: "step-3",
        title: "Draft findings first",
        instruction: "Produce findings before summary, with missing-test notes where relevant.",
      },
    ],
    versions: [
      {
        version: "1.4.0",
        publishedAt: "2026-03-28T00:00:00.000Z",
        changelog: "Refined missing-test guidance and updated GitHub compatibility metadata.",
      },
      {
        version: "1.3.0",
        publishedAt: "2026-02-12T00:00:00.000Z",
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
      bio: "Market workflow author sharing repeatable analyst playbooks for daily recap and watchlist building.",
    },
    tags: ["finance", "markets", "analysis"],
    keywords: ["market", "close", "sector", "watchlist"],
    runtimeFamilies: ["openclaw", "generic"],
    requiredTools: ["browser", "terminal"],
    installCount: 928,
    favoriteCount: 201,
    latestVersion: "0.9.2",
    updatedAt: "2026-03-19T00:00:00.000Z",
    license: "Apache-2.0",
    steps: [
      {
        stepKey: "step-1",
        title: "Review index action",
        instruction: "Summarize SPY, QQQ, and IWM behavior with notable breadth signals.",
        tool: "browser",
      },
      {
        stepKey: "step-2",
        title: "Check sector rotation",
        instruction: "Identify leadership, laggards, and notable relative strength rotation.",
        tool: "browser",
      },
      {
        stepKey: "step-3",
        title: "Build next-day watchlist",
        instruction: "Extract catalysts, earnings, macro events, and setup candidates.",
        tool: "terminal",
      },
    ],
    versions: [
      {
        version: "0.9.2",
        publishedAt: "2026-03-19T00:00:00.000Z",
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
      bio: "Product operations author for launch workflows, release checklists, and cross-functional readiness systems.",
    },
    tags: ["product", "launch", "operations"],
    keywords: ["launch", "ai", "checklist", "release"],
    runtimeFamilies: ["codex", "generic"],
    requiredTools: ["docs", "github", "notion"],
    installCount: 611,
    favoriteCount: 146,
    latestVersion: "2.1.0",
    updatedAt: "2026-03-30T00:00:00.000Z",
    license: "MIT",
    steps: [
      {
        stepKey: "step-1",
        title: "Validate scope and release status",
        instruction: "Confirm feature flag state, rollout plan, and launch owner.",
      },
      {
        stepKey: "step-2",
        title: "Check risk gates",
        instruction: "Review quality, analytics, docs, and trust readiness before launch.",
      },
      {
        stepKey: "step-3",
        title: "Publish launch brief",
        instruction: "Generate a concise go-live brief with open risks and contingency plan.",
      },
    ],
    versions: [
      {
        version: "2.1.0",
        publishedAt: "2026-03-30T00:00:00.000Z",
        changelog: "Expanded trust and analytics readiness checks.",
      },
    ],
  },
];

async function main() {
  await prisma.rateLimitBucket.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.workflowInstall.deleteMany();
  await prisma.workflowRequiredTool.deleteMany();
  await prisma.workflowRuntime.deleteMany();
  await prisma.workflowKeyword.deleteMany();
  await prisma.workflowTag.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.workflowVersion.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.user.deleteMany();

  for (const workflow of workflows) {
    const author = await prisma.user.upsert({
      where: { username: workflow.author.username },
      update: {
        displayName: workflow.author.displayName,
        bio: workflow.author.bio,
      },
      create: {
        username: workflow.author.username,
        displayName: workflow.author.displayName,
        bio: workflow.author.bio,
      },
    });

    await prisma.workflow.create({
      data: {
        slug: workflow.slug,
        name: workflow.name,
        summary: workflow.summary,
        description: workflow.description,
        latestVersion: workflow.latestVersion,
        updatedAt: new Date(workflow.updatedAt),
        installCount: workflow.installCount,
        favoriteCount: workflow.favoriteCount,
        license: workflow.license,
        authorId: author.id,
        versions: {
          create: workflow.versions.map((version) => {
            const artifacts = buildArtifacts(workflow, version, workflow.author);

            return {
              version: version.version,
              publishedAt: new Date(version.publishedAt),
              changelog: version.changelog,
              manifestJson: artifacts.manifestJson,
              workflowJson: artifacts.workflowJson,
              readmeMarkdown: artifacts.readmeMarkdown,
              publishedById: author.id,
            };
          }),
        },
        steps: {
          create: workflow.steps.map((step, index) => ({
            stepKey: step.stepKey,
            position: index + 1,
            title: step.title,
            instruction: step.instruction,
            tool: step.tool,
          })),
        },
        tags: {
          create: workflow.tags.map((tag) => ({ tag })),
        },
        keywords: {
          create: workflow.keywords.map((keyword) => ({ keyword })),
        },
        runtimes: {
          create: workflow.runtimeFamilies.map((runtime) => ({ runtime })),
        },
        tools: {
          create: workflow.requiredTools.map((tool) => ({ tool })),
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
