import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reportError } from "@/lib/error-monitor";
import { getAppRelease, getAppVersion } from "@/lib/env";
import { logError } from "@/lib/logger";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id");

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ready",
      service: "workflowhub-web",
      version: getAppVersion(),
      release: getAppRelease() ?? null,
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    await reportError(error, {
      route: "/api/ready",
      requestId,
      type: "readiness",
    });
    logError("Readiness check failed", {
      route: "/api/ready",
      requestId,
      error: error instanceof Error ? error.message : "Unknown database readiness error",
    });

    return NextResponse.json(
      {
        status: "not-ready",
        service: "workflowhub-web",
        version: getAppVersion(),
        release: getAppRelease() ?? null,
        message: error instanceof Error ? error.message : "Unknown database readiness error",
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
