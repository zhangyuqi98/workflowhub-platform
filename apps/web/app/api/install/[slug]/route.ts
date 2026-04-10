import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildInstallMetadata } from "@/lib/workflow-artifact";
import type { RuntimeFamily } from "@schema/types";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const workflow = await prisma.workflow.findUnique({
    where: { slug },
    include: {
      author: true,
      versions: {
        orderBy: {
          publishedAt: "desc",
        },
      },
      runtimes: true,
      tools: true,
    },
  });

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const baseUrl = new URL(request.url).origin;
  const metadata = buildInstallMetadata({
    slug: workflow.slug,
    name: workflow.name,
    summary: workflow.summary,
    description: workflow.description,
    latestVersion: workflow.latestVersion,
    runtimeFamilies: workflow.runtimes.map((item) => item.runtime as RuntimeFamily),
    requiredTools: workflow.tools.map((item) => item.tool),
    author: {
      username: workflow.author.username,
      displayName: workflow.author.displayName,
    },
    versions: workflow.versions.map((version) => ({
      version: version.version,
      publishedAt: version.publishedAt,
      changelog: version.changelog,
    })),
    baseUrl,
  });

  return NextResponse.json(metadata);
}
