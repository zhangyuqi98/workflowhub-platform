import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { reportError } from "@/lib/error-monitor";
import {
  clearPublisherSessionResponse,
  createPublisherTokenSessionResponse,
  getPublisherActorFromRequest,
  getPublisherSessionState,
  isPublisherAuthEnabled,
  verifyPublishToken,
} from "@/lib/publisher-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const state = await getPublisherSessionState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "publisher-session", 10, 60_000);
  if (limited) {
    return limited;
  }

  if (!isPublisherAuthEnabled()) {
    return NextResponse.json({ ok: true, enabled: false });
  }

  const payload = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = payload?.token?.trim();

  if (!token || !verifyPublishToken(token)) {
    await reportError(new Error("Invalid publisher token attempt"), {
      route: "/api/publisher-session",
      requestId: request.headers.get("x-request-id"),
    });
    return NextResponse.json({ error: "Invalid publisher token." }, { status: 401 });
  }

  await writeAuditLog({
    action: "auth.token.login",
    targetType: "auth-session",
    targetId: "publisher-token",
    actor: { kind: "token" },
    request,
    metadata: {
      mode: "token",
    },
  });

  return createPublisherTokenSessionResponse();
}

export async function DELETE(request: Request) {
  await writeAuditLog({
    action: "auth.logout",
    targetType: "auth-session",
    targetId: "publisher-session",
    actor: getPublisherActorFromRequest(request),
    request,
  });

  return clearPublisherSessionResponse();
}
