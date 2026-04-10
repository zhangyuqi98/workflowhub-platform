import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { reportError } from "@/lib/error-monitor";
import { normalizePublishPayload, type PublishWorkflowInput, validatePublishPayload } from "@/lib/publish-workflow";
import { getPublisherActorFromRequest, getPublisherUserFromRequest, requirePublisherAccess } from "@/lib/publisher-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { listWorkflows, parseWorkflowQuery } from "@/lib/registry";
import { buildWorkflowArtifacts } from "@/lib/workflow-artifact";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const checkSlug = searchParams.get("checkSlug");

  if (checkSlug) {
    const slug = checkSlug.trim();
    const existing = await prisma.workflow.findUnique({
      where: { slug },
      select: { slug: true },
    });

    return NextResponse.json({
      slug,
      available: !existing,
    });
  }

  const query = parseWorkflowQuery(searchParams);
  const result = await listWorkflows(query);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "workflow-mutations", 30, 60_000);
  if (limited) {
    return limited;
  }

  const unauthorized = requirePublisherAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  const requestUser = getPublisherUserFromRequest(request);
  const rawPayload = (await request.json()) as PublishWorkflowInput;
  const payload: PublishWorkflowInput = requestUser
    ? {
        ...rawPayload,
        publisherUsername: requestUser.username,
        publisherDisplayName: requestUser.displayName,
      }
    : rawPayload;
  const validationError = validatePublishPayload(payload);

  if (validationError) {
    await reportError(new Error(validationError), {
      route: "/api/workflows",
      requestId: request.headers.get("x-request-id"),
      type: "validation",
    });
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const normalized = normalizePublishPayload(payload);
  const existing = await prisma.workflow.findUnique({
    where: { slug: normalized.slug },
    select: { id: true },
  });

  if (existing) {
    await reportError(new Error("Duplicate workflow slug"), {
      route: "/api/workflows",
      requestId: request.headers.get("x-request-id"),
      slug: normalized.slug,
      type: "conflict",
    });
    return NextResponse.json({ error: "A workflow with this slug already exists." }, { status: 409 });
  }

  const author = await prisma.user.upsert({
    where: { username: normalized.publisherUsername },
    update: {
      displayName: normalized.publisherDisplayName,
    },
    create: {
      username: normalized.publisherUsername,
      displayName: normalized.publisherDisplayName,
      bio: "Workflow publisher on WorkflowHub.",
    },
  });

  const artifacts = buildWorkflowArtifacts({
    ...normalized,
    publishedAt: new Date(),
  });

  const workflow = await prisma.workflow.create({
    data: {
      slug: normalized.slug,
      name: normalized.name,
      summary: normalized.summary,
      description: normalized.description,
      latestVersion: normalized.version,
      updatedAt: new Date(),
      installCount: 0,
      favoriteCount: 0,
      license: normalized.license,
      authorId: author.id,
      versions: {
        create: [
          {
            version: normalized.version,
            publishedAt: new Date(),
            changelog: normalized.changelog,
            manifestJson: artifacts.manifestJson,
            workflowJson: artifacts.workflowJson,
            readmeMarkdown: artifacts.readmeMarkdown,
            publishedById: author.id,
          },
        ],
      },
      steps: {
        create: normalized.steps,
      },
      tags: {
        create: normalized.tags.map((tag) => ({ tag })),
      },
      keywords: {
        create: normalized.keywords.map((keyword) => ({ keyword })),
      },
      runtimes: {
        create: normalized.runtimeFamilies.map((runtime) => ({ runtime })),
      },
      tools: {
        create: normalized.requiredTools.map((tool) => ({ tool })),
      },
    },
    select: {
      slug: true,
    },
  });

  await writeAuditLog({
    action: "workflow.create",
    targetType: "workflow",
    targetId: workflow.slug,
    actor: getPublisherActorFromRequest(request),
    request,
    metadata: {
      version: normalized.version,
      author: normalized.publisherUsername,
      tags: normalized.tags,
      runtimeFamilies: normalized.runtimeFamilies,
    },
  });

  return NextResponse.json({ ok: true, slug: workflow.slug }, { status: 201 });
}
