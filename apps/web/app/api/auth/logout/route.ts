import { getBaseUrl } from "@/lib/env";
import { writeAuditLog } from "@/lib/audit-log";
import { clearPublisherSessionResponse, getPublisherActorFromRequest } from "@/lib/publisher-auth";

export async function GET(request: Request) {
  await writeAuditLog({
    action: "auth.logout",
    targetType: "auth-session",
    targetId: "publisher-session",
    actor: getPublisherActorFromRequest(request),
    request,
  });

  return clearPublisherSessionResponse(`${getBaseUrl()}/`);
}
