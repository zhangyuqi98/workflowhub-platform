import { NextResponse } from "next/server";
import { getAppRelease, getAppVersion, getRateLimitStore } from "@/lib/env";

export async function GET(request: Request) {
  return NextResponse.json({
    service: "workflowhub-web",
    version: getAppVersion(),
    release: getAppRelease() ?? null,
    rateLimitStore: getRateLimitStore(),
    requestId: request.headers.get("x-request-id"),
    timestamp: new Date().toISOString(),
  });
}
