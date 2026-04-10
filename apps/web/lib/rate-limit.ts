import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRateLimitStore } from "@/lib/env";
import { logWarn } from "@/lib/logger";

type Bucket = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Bucket>();

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function createRateLimitResponse(retryAfterMs: number, requestId: string | null) {
  const response = NextResponse.json(
    {
      error: "Rate limit exceeded. Please wait and try again.",
      retryAfterMs,
      requestId,
    },
    { status: 429 }
  );

  response.headers.set("Retry-After", String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
  return response;
}

function enforceMemoryRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = `${scope}:${getClientKey(request)}`;
  const current = store.get(key);
  const requestId = request.headers.get("x-request-id");

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return null;
  }

  if (current.count >= limit) {
    return createRateLimitResponse(current.resetAt - now, requestId);
  }

  current.count += 1;
  store.set(key, current);
  return null;
}

async function enforceDatabaseRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const now = new Date();
  const actorKey = getClientKey(request);
  const bucketKey = `${scope}:${actorKey}`;
  const requestId = request.headers.get("x-request-id");

  const existing = await prisma.rateLimitBucket.findUnique({
    where: {
      bucketKey,
    },
  });

  if (!existing || existing.resetAt <= now) {
    await prisma.rateLimitBucket.upsert({
      where: {
        bucketKey,
      },
      update: {
        scope,
        actorKey,
        count: 1,
        resetAt: new Date(now.getTime() + windowMs),
      },
      create: {
        bucketKey,
        scope,
        actorKey,
        count: 1,
        resetAt: new Date(now.getTime() + windowMs),
      },
    });
    return null;
  }

  if (existing.count >= limit) {
    return createRateLimitResponse(existing.resetAt.getTime() - now.getTime(), requestId);
  }

  await prisma.rateLimitBucket.update({
    where: {
      bucketKey,
    },
    data: {
      count: {
        increment: 1,
      },
    },
  });

  return null;
}

export async function enforceRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  if (getRateLimitStore() !== "database") {
    return enforceMemoryRateLimit(request, scope, limit, windowMs);
  }

  try {
    return await enforceDatabaseRateLimit(request, scope, limit, windowMs);
  } catch (error) {
    logWarn("Falling back to in-memory rate limiting", {
      scope,
      requestId: request.headers.get("x-request-id"),
      error: error instanceof Error ? error.message : String(error),
    });
    return enforceMemoryRateLimit(request, scope, limit, windowMs);
  }
}
