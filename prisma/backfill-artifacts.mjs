import path from "node:path";
import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_URL?.startsWith("file:./")) {
  const workspaceRoot = process.env.INIT_CWD ?? process.cwd();
  process.env.DATABASE_URL = `file:${path.resolve(
    workspaceRoot,
    "prisma",
    process.env.DATABASE_URL.slice("file:./".length)
  )}`;
}

const prisma = new PrismaClient();

function dedupe(values) {
  return Array.from(
    new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))
  );
}

function buildArtifacts(workflow, version) {
  const toolPreferences = dedupe([
    ...workflow.tools.map((tool) => tool.tool),
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
      publishedAt: version.publishedAt.toISOString(),
      author: {
        username: workflow.author.username,
        displayName: workflow.author.displayName,
      },
      tags: workflow.tags.map((tag) => tag.tag),
      keywords: workflow.keywords.map((keyword) => keyword.keyword),
      runtimeFamilies: workflow.runtimes.map((runtime) => runtime.runtime),
      requiredTools: workflow.tools.map((tool) => tool.tool),
    },
    workflowJson: {
      id: workflow.slug,
      name: workflow.name,
      summary: workflow.summary,
      match: {
        keywords: workflow.keywords.map((keyword) => keyword.keyword),
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
      `Compatible runtimes: ${workflow.runtimes.map((runtime) => runtime.runtime).join(", ")}`,
      "",
      "## Steps",
      "",
      ...workflow.steps.map((step, index) => `${index + 1}. ${step.title}: ${step.instruction}`),
    ].join("\n"),
  };
}

async function main() {
  const workflows = await prisma.workflow.findMany({
    include: {
      author: true,
      versions: true,
      steps: {
        orderBy: {
          position: "asc",
        },
      },
      tags: true,
      keywords: true,
      runtimes: true,
      tools: true,
    },
  });

  for (const workflow of workflows) {
    for (const version of workflow.versions) {
      if (version.manifestJson && version.workflowJson && version.readmeMarkdown && version.publishedById) {
        continue;
      }

      const artifacts = buildArtifacts(workflow, version);
      await prisma.workflowVersion.update({
        where: {
          id: version.id,
        },
        data: {
          manifestJson: artifacts.manifestJson,
          workflowJson: artifacts.workflowJson,
          readmeMarkdown: artifacts.readmeMarkdown,
          publishedById: version.publishedById ?? workflow.authorId,
        },
      });
    }
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
