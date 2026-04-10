import { prisma } from "@/lib/db";
import { getPublisherActorFromRequest, type PublisherRequestActor } from "@/lib/publisher-auth";

type AuditAction =
  | "auth.github.login"
  | "auth.token.login"
  | "auth.logout"
  | "workflow.create"
  | "workflow.edit"
  | "workflow.version.publish"
  | "workflow.delete";

type AuditTargetType = "auth-session" | "workflow";

type WriteAuditLogInput = {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  actor?: PublisherRequestActor;
  metadata?: Record<string, unknown>;
  request?: Request;
};

function extractRequestMetadata(request: Request | undefined) {
  if (!request) {
    return {};
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");
  const requestId = request.headers.get("x-request-id");
  const path = (() => {
    try {
      return new URL(request.url).pathname;
    } catch {
      return undefined;
    }
  })();

  return {
    ip: forwardedFor?.split(",")[0]?.trim() || realIp || null,
    userAgent: userAgent || null,
    requestId: requestId || null,
    path: path || null,
  };
}

function buildActorData(actor: PublisherRequestActor) {
  if (actor.kind === "user") {
    return {
      actorType: "user",
      actorId: actor.user.username,
      userLookup: {
        username: actor.user.username,
      },
    };
  }

  if (actor.kind === "token") {
    return {
      actorType: "token",
      actorId: "token-session",
      userLookup: undefined,
    };
  }

  return {
    actorType: "anonymous",
    actorId: null,
    userLookup: undefined,
  };
}

export async function writeAuditLog({
  action,
  targetType,
  targetId,
  actor,
  metadata,
  request,
}: WriteAuditLogInput) {
  const resolvedActor = actor ?? (request ? getPublisherActorFromRequest(request) : { kind: "anonymous" as const });
  const actorData = buildActorData(resolvedActor);
  const requestMetadata = extractRequestMetadata(request);

  try {
    await prisma.auditLog.create({
      data: {
        action,
        targetType,
        targetId: targetId ?? null,
        actorType: actorData.actorType,
        actorId: actorData.actorId,
        metadata: {
          ...requestMetadata,
          ...(metadata ?? {}),
        },
        user: actorData.userLookup
          ? {
              connect: actorData.userLookup,
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log", {
      action,
      targetType,
      targetId,
      error,
    });
  }
}
