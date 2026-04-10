import type {
  AuthorProfile,
  RegistryStats,
  RuntimeFamily,
  TagSummary,
  WorkflowListResponse,
  WorkflowListing,
  WorkflowQuery,
} from "@schema/types";
import { prisma } from "@/lib/db";
import { shouldSkipDatabaseDuringBuild } from "@/lib/env";

function shouldUseBuildFallback() {
  return shouldSkipDatabaseDuringBuild();
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesQuery(workflow: WorkflowListing, query: WorkflowQuery) {
  const q = query.q ? normalize(query.q) : "";
  const tag = query.tag ? normalize(query.tag) : "";
  const runtime = query.runtime ? normalize(query.runtime) : "";
  const tool = query.tool ? normalize(query.tool) : "";

  if (q) {
    const haystack = [
      workflow.name,
      workflow.summary,
      workflow.description,
      workflow.author.displayName,
      workflow.author.username,
      ...workflow.tags,
      ...workflow.keywords,
      ...workflow.requiredTools,
    ]
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(q)) {
      return false;
    }
  }

  if (tag && !workflow.tags.some((item) => normalize(item) === tag)) {
    return false;
  }

  if (runtime && !workflow.runtimeFamilies.some((item) => normalize(item) === runtime)) {
    return false;
  }

  if (tool && !workflow.requiredTools.some((item) => normalize(item) === tool)) {
    return false;
  }

  return true;
}

function sortByInstallsThenUpdated(workflows: WorkflowListing[]) {
  return [...workflows].sort((left, right) => {
    if (right.installCount !== left.installCount) {
      return right.installCount - left.installCount;
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

async function fetchWorkflowListings(): Promise<WorkflowListing[]> {
  const workflows = await prisma.workflow.findMany({
    include: {
      author: true,
      versions: {
        orderBy: {
          publishedAt: "desc",
        },
      },
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

  return workflows.map((workflow) => ({
    slug: workflow.slug,
    name: workflow.name,
    summary: workflow.summary,
    description: workflow.description,
    author: {
      username: workflow.author.username,
      displayName: workflow.author.displayName,
    },
    tags: workflow.tags.map((item) => item.tag),
    keywords: workflow.keywords.map((item) => item.keyword),
    runtimeFamilies: workflow.runtimes.map((item) => item.runtime as RuntimeFamily),
    requiredTools: workflow.tools.map((item) => item.tool),
    installCount: workflow.installCount,
    favoriteCount: workflow.favoriteCount,
    latestVersion: workflow.latestVersion,
    updatedAt: workflow.updatedAt.toISOString().slice(0, 10),
    license: workflow.license,
    steps: workflow.steps.map((step) => ({
      id: step.stepKey,
      title: step.title,
      instruction: step.instruction,
      tool: step.tool ?? undefined,
    })),
    versions: workflow.versions.map((version) => ({
      version: version.version,
      publishedAt: version.publishedAt.toISOString().slice(0, 10),
      changelog: version.changelog,
    })),
  }));
}

export async function listWorkflows(query: WorkflowQuery = {}): Promise<WorkflowListResponse> {
  if (shouldUseBuildFallback()) {
    return {
      items: [],
      total: 0,
      filters: query,
    };
  }

  const filtered = sortByInstallsThenUpdated(await fetchWorkflowListings()).filter((workflow) =>
    matchesQuery(workflow, query)
  );

  return {
    items: filtered,
    total: filtered.length,
    filters: query,
  };
}

export async function listFeaturedWorkflows(): Promise<WorkflowListing[]> {
  if (shouldUseBuildFallback()) {
    return [];
  }
  return sortByInstallsThenUpdated(await fetchWorkflowListings()).slice(0, 6);
}

export async function getWorkflowBySlug(slug: string): Promise<WorkflowListing | null> {
  if (shouldUseBuildFallback()) {
    return null;
  }

  const workflow = await prisma.workflow.findUnique({
    where: { slug },
    include: {
      author: true,
      versions: {
        orderBy: {
          publishedAt: "desc",
        },
      },
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

  if (!workflow) {
    return null;
  }

  const [listing] = await Promise.all([
    Promise.resolve({
      slug: workflow.slug,
      name: workflow.name,
      summary: workflow.summary,
      description: workflow.description,
      author: {
        username: workflow.author.username,
        displayName: workflow.author.displayName,
      },
      tags: workflow.tags.map((item) => item.tag),
      keywords: workflow.keywords.map((item) => item.keyword),
      runtimeFamilies: workflow.runtimes.map((item) => item.runtime as RuntimeFamily),
      requiredTools: workflow.tools.map((item) => item.tool),
      installCount: workflow.installCount,
      favoriteCount: workflow.favoriteCount,
      latestVersion: workflow.latestVersion,
      updatedAt: workflow.updatedAt.toISOString().slice(0, 10),
      license: workflow.license,
      steps: workflow.steps.map((step) => ({
        id: step.stepKey,
        title: step.title,
        instruction: step.instruction,
        tool: step.tool ?? undefined,
      })),
      versions: workflow.versions.map((version) => ({
        version: version.version,
        publishedAt: version.publishedAt.toISOString().slice(0, 10),
        changelog: version.changelog,
      })),
    }),
  ]);

  return listing;
}

export async function listTags(): Promise<TagSummary[]> {
  if (shouldUseBuildFallback()) {
    return [];
  }

  const tags = await prisma.workflowTag.groupBy({
    by: ["tag"],
    _count: {
      tag: true,
    },
    orderBy: {
      _count: {
        tag: "desc",
      },
    },
  });

  return tags.map((tag) => ({
    tag: tag.tag,
    count: tag._count.tag,
  }));
}

export async function getAuthorProfile(username: string): Promise<AuthorProfile | null> {
  if (shouldUseBuildFallback()) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      workflows: {
        include: {
          author: true,
          versions: {
            orderBy: {
              publishedAt: "desc",
            },
          },
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
      },
    },
  });

  if (!user) {
    return null;
  }

  const workflows: WorkflowListing[] = user.workflows.map((workflow) => ({
    slug: workflow.slug,
    name: workflow.name,
    summary: workflow.summary,
    description: workflow.description,
    author: {
      username: user.username,
      displayName: user.displayName,
    },
    tags: workflow.tags.map((item) => item.tag),
    keywords: workflow.keywords.map((item) => item.keyword),
    runtimeFamilies: workflow.runtimes.map((item) => item.runtime as RuntimeFamily),
    requiredTools: workflow.tools.map((item) => item.tool),
    installCount: workflow.installCount,
    favoriteCount: workflow.favoriteCount,
    latestVersion: workflow.latestVersion,
    updatedAt: workflow.updatedAt.toISOString().slice(0, 10),
    license: workflow.license,
    steps: workflow.steps.map((step) => ({
      id: step.stepKey,
      title: step.title,
      instruction: step.instruction,
      tool: step.tool ?? undefined,
    })),
    versions: workflow.versions.map((version) => ({
      version: version.version,
      publishedAt: version.publishedAt.toISOString().slice(0, 10),
      changelog: version.changelog,
    })),
  }));

  return {
    username: user.username,
    displayName: user.displayName,
    bio:
      user.bio ??
      "Workflow author on WorkflowHub. This profile will later include trust signals, install analytics, and publishing history.",
    workflows: sortByInstallsThenUpdated(workflows),
  };
}

export async function getRegistryStats(): Promise<RegistryStats> {
  if (shouldUseBuildFallback()) {
    return {
      workflowCount: 0,
      authorCount: 0,
      installCount: 0,
    };
  }

  const [workflowCount, authors, installAggregate] = await Promise.all([
    prisma.workflow.count(),
    prisma.workflow.findMany({
      select: { authorId: true },
      distinct: ["authorId"],
    }),
    prisma.workflow.aggregate({
      _sum: {
        installCount: true,
      },
    }),
  ]);

  return {
    workflowCount,
    authorCount: authors.length,
    installCount: installAggregate._sum.installCount ?? 0,
  };
}

export function parseWorkflowQuery(searchParams: URLSearchParams): WorkflowQuery {
  const runtime = searchParams.get("runtime");
  return {
    q: searchParams.get("q") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    runtime: (runtime as RuntimeFamily | null) ?? undefined,
    tool: searchParams.get("tool") ?? undefined,
  };
}
