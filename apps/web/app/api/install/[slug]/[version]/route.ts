import { NextResponse } from "next/server";
import type {
  PublishedWorkflowManifest,
  RuntimeFamily,
  WorkflowFileArtifact,
} from "@schema/types";
import { prisma } from "@/lib/db";
import { buildPublishedWorkflowBundle } from "@/lib/workflow-artifact";

type RouteProps = {
  params: Promise<{ slug: string; version: string }>;
};

type InstallRecordInput = {
  runtimeFamily?: RuntimeFamily;
  installSource?: string;
};

function isRuntimeFamily(value: string): value is RuntimeFamily {
  return value === "openclaw" || value === "codex" || value === "generic";
}

async function loadWorkflowVersion(slug: string, version: string) {
  return prisma.workflow.findUnique({
    where: { slug },
    include: {
      versions: {
        where: {
          version,
        },
        take: 1,
      },
    },
  });
}

export async function GET(request: Request, { params }: RouteProps) {
  const { slug, version } = await params;
  const workflow = await loadWorkflowVersion(slug, version);
  const publishedVersion = workflow?.versions[0];

  if (!workflow || !publishedVersion) {
    return NextResponse.json({ error: "Workflow version not found" }, { status: 404 });
  }

  if (!publishedVersion.manifestJson || !publishedVersion.workflowJson || !publishedVersion.readmeMarkdown) {
    return NextResponse.json({ error: "Workflow artifact is not available for this version yet." }, { status: 409 });
  }

  const format = new URL(request.url).searchParams.get("format");
  const manifest = publishedVersion.manifestJson as PublishedWorkflowManifest;
  const workflowJson = publishedVersion.workflowJson as WorkflowFileArtifact;
  const bundle = buildPublishedWorkflowBundle(manifest, workflowJson, publishedVersion.readmeMarkdown);

  if (format === "manifest") {
    return NextResponse.json(manifest);
  }

  if (format === "workflow") {
    return NextResponse.json(workflowJson);
  }

  return NextResponse.json(bundle);
}

export async function POST(request: Request, { params }: RouteProps) {
  const { slug, version } = await params;
  const workflow = await loadWorkflowVersion(slug, version);
  const publishedVersion = workflow?.versions[0];

  if (!workflow || !publishedVersion) {
    return NextResponse.json({ error: "Workflow version not found" }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as InstallRecordInput;
  if (payload.runtimeFamily && !isRuntimeFamily(payload.runtimeFamily)) {
    return NextResponse.json({ error: "Unsupported runtime family." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.workflowInstall.create({
      data: {
        workflowId: workflow.id,
        workflowVersionId: publishedVersion.id,
        runtimeFamily: payload.runtimeFamily ?? null,
        installSource: payload.installSource?.trim() || "api",
      },
    });

    const updatedWorkflow = await tx.workflow.update({
      where: { id: workflow.id },
      data: {
        installCount: {
          increment: 1,
        },
      },
      select: {
        installCount: true,
      },
    });

    return updatedWorkflow;
  });

  return NextResponse.json({
    ok: true,
    slug,
    version,
    installCount: result.installCount,
  });
}
