import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePublisherAccess } from "@/lib/publisher-auth";

export async function GET(request: Request) {
  const unauthorized = requirePublisherAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;

  const logs = await prisma.auditLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    select: {
      id: true,
      action: true,
      actorType: true,
      actorId: true,
      targetType: true,
      targetId: true,
      metadata: true,
      createdAt: true,
      user: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: logs,
  });
}
