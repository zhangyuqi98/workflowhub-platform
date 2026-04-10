import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit-log";
import { reportError } from "@/lib/error-monitor";
import { getBaseUrl } from "@/lib/env";
import {
  createPublisherUserSessionResponse,
  exchangeGitHubCodeForUser,
  verifyGitHubState,
} from "@/lib/publisher-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const stateCookie = cookieHeader.match(/workflowhub_github_state=([^;]+)/)?.[1];

  if (!code || !state || !stateCookie || !verifyGitHubState(stateCookie) || !stateCookie.startsWith(`${state}.`)) {
    return Response.redirect(new URL("/publish?authError=github", getBaseUrl()));
  }

  try {
    const githubUser = await exchangeGitHubCodeForUser(code);
    const existing =
      (githubUser.githubId
        ? await prisma.user.findUnique({
            where: {
              githubId: githubUser.githubId,
            },
          })
        : null) ??
      (githubUser.githubLogin
        ? await prisma.user.findUnique({
            where: {
              githubLogin: githubUser.githubLogin,
            },
          })
        : null) ??
      (githubUser.username
        ? await prisma.user.findUnique({
            where: {
              username: githubUser.username,
            },
          })
        : null);

    const user = existing
      ? await prisma.user.update({
          where: {
            id: existing.id,
          },
          data: {
            username: githubUser.username,
            displayName: githubUser.displayName,
            githubId: githubUser.githubId ?? undefined,
            githubLogin: githubUser.githubLogin ?? undefined,
            avatarUrl: githubUser.avatarUrl ?? undefined,
          },
        })
      : await prisma.user.create({
          data: {
            username: githubUser.username,
            displayName: githubUser.displayName,
            githubId: githubUser.githubId ?? undefined,
            githubLogin: githubUser.githubLogin ?? undefined,
            avatarUrl: githubUser.avatarUrl ?? undefined,
            bio: "WorkflowHub publisher",
          },
        });

    await writeAuditLog({
      action: "auth.github.login",
      targetType: "auth-session",
      targetId: user.username,
      actor: {
        kind: "user",
        user: {
          username: user.username,
          displayName: user.displayName,
          githubLogin: user.githubLogin,
          githubId: user.githubId,
          avatarUrl: user.avatarUrl,
        },
      },
      request,
      metadata: {
        mode: "github",
      },
    });

    return createPublisherUserSessionResponse(
      {
        username: user.username,
        displayName: user.displayName,
        githubLogin: user.githubLogin,
        githubId: user.githubId,
        avatarUrl: user.avatarUrl,
      },
      `/users/${user.username}`
    );
  } catch (error) {
    await reportError(error, {
      route: "/api/auth/github/callback",
      requestId: request.headers.get("x-request-id"),
      type: "github_oauth",
    });
    return Response.redirect(new URL("/publish?authError=github", getBaseUrl()));
  }
}
