import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { reportError } from "@/lib/error-monitor";
import { normalizePublishPayload, type PublishWorkflowInput, validatePublishPayload } from "@/lib/publish-workflow";
import { getPublisherActorFromRequest, getPublisherUserFromRequest, requirePublisherAccess } from "@/lib/publisher-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getWorkflowBySlug } from "@/lib/registry";
import { buildWorkflowArtifacts } from "@/lib/workflow-artifact";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const workflow = await getWorkflowBySlug(slug);

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json(workflow);
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const limited = await enforceRateLimit(request, "workflow-mutations", 30, 60_000);
  if (limited) {
    return limited;
  }

  const unauthorized = requirePublisherAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { slug } = await params;
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
      route: "/api/workflows/[slug]",
      requestId: request.headers.get("x-request-id"),
      type: "validation",
      mode: "version",
    });
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const existing = await prisma.workflow.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          username: true,
        },
      },
      versions: {
        select: {
          version: true,
        },
      },
    },
  });

  if (!existing) {
    await reportError(new Error("Workflow not found"), {
      route: "/api/workflows/[slug]",
      requestId: request.headers.get("x-request-id"),
      slug,
      type: "not_found",
      mode: "version",
    });
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  if (requestUser && existing.author.username !== requestUser.username) {
    await reportError(new Error("Forbidden workflow version publish"), {
      route: "/api/workflows/[slug]",
      requestId: request.headers.get("x-request-id"),
      slug,
      type: "forbidden",
      mode: "version",
    });
    return NextResponse.json({ error: "You can only publish new versions for your own workflows." }, { status: 403 });
  }

  const normalized = normalizePublishPayload(payload);
  const duplicateVersion = existing.versions.some((version) => version.version === normalized.version);

  if (duplicateVersion) {
    await reportError(new Error("Duplicate workflow version"), {
      route: "/api/workflows/[slug]",
      requestId: request.headers.get("x-request-id"),
      slug,
      version: normalized.version,
      type: "conflict",
      mode: "version",
    });
    return NextResponse.json({ error: "This version already exists for the selected workflow." }, { status: 409 });
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

  await prisma.$transaction(async (tx) => {
    await tx.workflow.update({
      where: { slug },
      data: {
        name: normalized.name,
        summary: normalized.summary,
        description: normalized.description,
        latestVersion: normalized.version,
        updatedAt: new Date(),
        license: normalized.license,
        authorId: author.id,
      },
    });

    await Promise.all([
      tx.workflowStep.deleteMany({ where: { workflowId: existing.id } }),
      tx.workflowTag.deleteMany({ where: { workflowId: existing.id } }),
      tx.workflowKeyword.deleteMany({ where: { workflowId: existing.id } }),
      tx.workflowRuntime.deleteMany({ where: { workflowId: existing.id } }),
      tx.workflowRequiredTool.deleteMany({ where: { workflowId: existing.id } }),
    ]);

    await tx.workflowVersion.create({
      data: {
        workflowId: existing.id,
        version: normalized.version,
        publishedAt: new Date(),
        changelog: normalized.changelog,
        manifestJson: artifacts.manifestJson,
        workflowJson: artifacts.workflowJson,
        readmeMarkdown: artifacts.readmeMarkdown,
        publishedById: author.id,
      },
    });

    await Promise.all([
      tx.workflowStep.createMany({
        data: normalized.steps.map((step) => ({
          workflowId: existing.id,
          stepKey: step.stepKey,
          position: step.position,
          title: step.title,
          instruction: step.instruction,
          tool: step.tool,
        })),
      }),
      normalized.tags.length
        ? tx.workflowTag.createMany({
            data: normalized.tags.map((tag) => ({
              workflowId: existing.id,
              tag,
            })),
          })
        : Promise.resolve(),
      normalized.keywords.length
        ? tx.workflowKeyword.createMany({
            data: normalized.keywords.map((keyword) => ({
              workflowId: existing.id,
              keyword,
            })),
          })
        : Promise.resolve(),
      normalized.runtimeFamilies.length
        ? tx.workflowRuntime.createMany({
            data: normalized.runtimeFamilies.map((runtime) => ({
              workflowId: existing.id,
              runtime,
            })),
          })
        : Promise.resolve(),
      normalized.requiredTools.length
        ? tx.workflowRequiredTool.createMany({
            data: normalized.requiredTools.map((tool) => ({
              workflowId: existing.id,
              tool,
            })),
          })
        : Promise.resolve(),
    ]);
  });

  await writeAuditLog({
    action: "workflow.version.publish",
    targetType: "workflow",
    targetId: slug,
    actor: getPublisherActorFromRequest(request),
    request,
    metadata: {
      version: normalized.version,
      author: normalized.publisherUsername,
    },
  });

  return NextResponse.json({ ok: true, slug, mode: "version" });
}

export async function PUT(request: Request, { params }: RouteProps) {
  const limited = await enforceRateLimit(request, "workflow-mutations", 30, 60_000);
  if (limited) {
    return limited;
  }

  const unauthorized = requirePublisherAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { slug } = await params;
  const requestUser = getPublisherUserFromRequest(request);
  const rawPayload = (await request.json()) as PublishWorkflowInput;
  const payload: PublishWorkflowInput = requestUser
    ? {
        ...rawPayload,
        publisherUsername: requestUser.username,
        publisherDisplayName: requestUser.displayName,
      }
    : rawPayload;
  const validationError = validatePublishPayload(payload, { requireChangelog: false });

  if (validationError) {
    await reportError(new Error(validationError), {
      route: "/api/workflows/[slug]",
      requestId: request.headers.get("x-request-id"),
      type: "validation",
      mode: "edit",
    });
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const existing = await prisma.workflow.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!existing) {
    await reportError(new Error("Workflow not found"), {
      route: "/api/workflows/[slug]",
      requestId: request.headers.get("x-request-id"),
      slug,
      type: "not_found",
      mode: "edit",
    });
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  if (requestUser && existing.author.username !== requestUser.username) {
    await reportError(new Error("Forbidden workflow edit"), {
      route: "/api/workflows/[slug]",
      requestId: request.headers.get("x-request-id"),
      slug,
      type: "forbidden",
      mode: "edit",
    });
    return NextResponse.json({ error: "You can only edit your own workflows." }, { status: 403 });
  }

  const normalized = normalizePublishPayload({
    ...payload,
    slug,
    version: payload.version ?? existing.latestVersion,
    changelog: payload.changelog ?? "Metadata update",
  });

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

  await prisma.$transaction(async (tx) => {
    await tx.workflow.update({
      where: { slug },
      data: {
        name: normalized.name,
        summary: normalized.summary,
        description: normalized.description,
        license: normalized.license,
        updatedAt: new Date(),
        authorId: author.id,
      },
    });

    await Promise.all([
      tx.workflowStep.deleteMany({ where: { workflowId: existing.id } }),
      tx.workflowTag.deleteMany({ where: { workflowId: existing.id } }),
      tx.workflowKeyword.deleteMany({ where: { workflowId: existing.id } }),
      tx.workflowRuntime.deleteMany({ where: { workflowId: existing.id } }),
      tx.workflowRequiredTool.deleteMany({ where: { workflowId: existing.id } }),
    ]);

    await tx.workflowStep.createMany({
      data: normalized.steps.map((step) => ({
        workflowId: existing.id,
        stepKey: step.stepKey,
        position: step.position,
        title: step.title,
        instruction: step.instruction,
        tool: step.tool,
      })),
    });

    if (normalized.tags.length) {
      await tx.workflowTag.createMany({
        data: normalized.tags.map((tag) => ({
          workflowId: existing.id,
          tag,
        })),
      });
    }

    if (normalized.keywords.length) {
      await tx.workflowKeyword.createMany({
        data: normalized.keywords.map((keyword) => ({
          workflowId: existing.id,
          keyword,
        })),
      });
    }

    if (normalized.runtimeFamilies.length) {
      await tx.workflowRuntime.createMany({
        data: normalized.runtimeFamilies.map((runtime) => ({
          workflowId: existing.id,
          runtime,
        })),
      });
    }

    if (normalized.requiredTools.length) {
      await tx.workflowRequiredTool.createMany({
        data: normalized.requiredTools.map((tool) => ({
          workflowId: existing.id,
          tool,
        })),
      });
    }

    // V1 keeps the "edit metadata" flow, so we refresh the latest version bundle
    // to keep install output aligned with the visible workflow listing.
    await tx.workflowVersion.updateMany({
      where: {
        workflowId: existing.id,
        version: existing.latestVersion,
      },
      data: {
        manifestJson: artifacts.manifestJson,
        workflowJson: artifacts.workflowJson,
        readmeMarkdown: artifacts.readmeMarkdown,
        publishedById: author.id,
      },
    });
  });

  await writeAuditLog({
    action: "workflow.edit",
    targetType: "workflow",
    targetId: slug,
    actor: getPublisherActorFromRequest(request),
    request,
    metadata: {
      version: normalized.version,
      author: normalized.publisherUsername,
    },
  });

  return NextResponse.json({ ok: true, slug, mode: "edit" });
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  const limited = await enforceRateLimit(_request, "workflow-mutations", 30, 60_000);
  if (limited) {
    return limited;
  }

  const unauthorized = requirePublisherAccess(_request);
  if (unauthorized) {
    return unauthorized;
  }

  const requestUser = getPublisherUserFromRequest(_request);
  const { slug } = await params;

  const existing = await prisma.workflow.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!existing) {
    await reportError(new Error("Workflow not found"), {
      route: "/api/workflows/[slug]",
      requestId: _request.headers.get("x-request-id"),
      slug,
      type: "not_found",
      mode: "delete",
    });
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  if (requestUser && existing.author.username !== requestUser.username) {
    await reportError(new Error("Forbidden workflow delete"), {
      route: "/api/workflows/[slug]",
      requestId: _request.headers.get("x-request-id"),
      slug,
      type: "forbidden",
      mode: "delete",
    });
    return NextResponse.json({ error: "You can only delete your own workflows." }, { status: 403 });
  }

  await prisma.workflow.delete({
    where: { slug },
  });

  await writeAuditLog({
    action: "workflow.delete",
    targetType: "workflow",
    targetId: slug,
    actor: getPublisherActorFromRequest(_request),
    request: _request,
    metadata: {
      author: existing.author.username,
    },
  });

  return NextResponse.json({ ok: true, slug, mode: "delete" });
}
