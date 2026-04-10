import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reportError } from "@/lib/error-monitor";
import { getAppRelease, getAppVersion, getBaseUrl, getRateLimitStore } from "@/lib/env";
import { logError } from "@/lib/logger";
import { getPublisherAccessMode } from "@/lib/publisher-auth";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id");

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      service: "workflowhub-web",
      version: getAppVersion(),
      release: getAppRelease() ?? null,
      database: "reachable",
      auth: {
        mode: getPublisherAccessMode(),
      },
      rateLimit: {
        store: getRateLimitStore(),
      },
      requestId,
      baseUrl: getBaseUrl(),
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    await reportError(error, {
      route: "/api/health",
      requestId,
      type: "healthcheck",
    });
    logError("Health check failed", {
      route: "/api/health",
      requestId,
      error: error instanceof Error ? error.message : "Unknown database error",
    });

    return NextResponse.json(
      {
        status: "error",
        service: "workflowhub-web",
        version: getAppVersion(),
        release: getAppRelease() ?? null,
        database: "unreachable",
        rateLimit: {
          store: getRateLimitStore(),
        },
        message: error instanceof Error ? error.message : "Unknown database error",
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
