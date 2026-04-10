import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  assertPublisherSessionSecret,
  getBaseUrl,
  getGitHubClientId,
  getGitHubClientSecret,
  getPublisherToken,
  getSessionSecret,
  isGitHubAuthEnabled,
  isPublisherAuthEnabled,
} from "@/lib/env";

const TOKEN_COOKIE_NAME = "workflowhub_publisher";
const USER_COOKIE_NAME = "workflowhub_user_session";
const GITHUB_STATE_COOKIE_NAME = "workflowhub_github_state";

export type PublisherUser = {
  username: string;
  displayName: string;
  githubLogin?: string | null;
  githubId?: string | null;
  avatarUrl?: string | null;
};

export type PublisherRequestActor =
  | {
      kind: "user";
      user: PublisherUser;
    }
  | {
      kind: "token";
    }
  | {
      kind: "anonymous";
    };

type UserSessionPayload = {
  username: string;
  displayName: string;
  githubLogin?: string | null;
  githubId?: string | null;
  avatarUrl?: string | null;
  issuedAt: number;
};

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createSignature(value: string) {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }
  return createHmac("sha256", secret).update(value).digest("hex");
}

function signTokenCookieValue() {
  const publishToken = getPublisherToken();
  if (!publishToken) {
    return null;
  }
  return createSignature(publishToken);
}

function encodePayload(payload: UserSessionPayload) {
  const serialized = JSON.stringify(payload);
  const encoded = Buffer.from(serialized).toString("base64url");
  const signature = createSignature(encoded);
  if (!signature) {
    return null;
  }
  return `${encoded}.${signature}`;
}

function decodePayload(value: string | undefined): UserSessionPayload | null {
  if (!value) {
    return null;
  }

  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = createSignature(encoded);
  if (!expected || !safeEqual(signature, expected)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as UserSessionPayload;
  } catch {
    return null;
  }
}

function parseCookieValue(cookieHeader: string, cookieName: string) {
  const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  return match?.[1];
}

function makeCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function verifyPublishToken(token: string) {
  const expectedToken = getPublisherToken();
  if (!expectedToken) {
    return true;
  }
  return safeEqual(token, expectedToken);
}

export function isAuthorizedPublisherCookie(cookieValue: string | undefined) {
  if (!isPublisherAuthEnabled()) {
    return false;
  }

  const signed = signTokenCookieValue();
  if (!cookieValue || !signed) {
    return false;
  }

  return safeEqual(cookieValue, signed);
}

export function getPublisherAccessMode() {
  if (isGitHubAuthEnabled()) {
    return "github";
  }
  if (isPublisherAuthEnabled()) {
    return "token";
  }
  return "open";
}

export async function getCurrentPublisherUser() {
  const cookieStore = await cookies();
  const payload = decodePayload(cookieStore.get(USER_COOKIE_NAME)?.value);

  if (!payload) {
    return null;
  }

  return {
    username: payload.username,
    displayName: payload.displayName,
    githubLogin: payload.githubLogin ?? null,
    githubId: payload.githubId ?? null,
    avatarUrl: payload.avatarUrl ?? null,
  } satisfies PublisherUser;
}

export async function getPublisherSessionState() {
  const mode = getPublisherAccessMode();

  if (mode === "open") {
    return {
      enabled: false,
      authorized: true,
      mode,
      user: null,
    };
  }

  const cookieStore = await cookies();
  const tokenAuthorized = isAuthorizedPublisherCookie(cookieStore.get(TOKEN_COOKIE_NAME)?.value);
  const user = decodePayload(cookieStore.get(USER_COOKIE_NAME)?.value);

  return {
    enabled: true,
    authorized: tokenAuthorized || Boolean(user),
    mode,
    user: user
      ? {
          username: user.username,
          displayName: user.displayName,
          githubLogin: user.githubLogin ?? null,
          githubId: user.githubId ?? null,
          avatarUrl: user.avatarUrl ?? null,
        }
      : null,
  };
}

export function requirePublisherAccess(request: Request) {
  const mode = getPublisherAccessMode();
  if (mode === "open") {
    return null;
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const tokenCookie = parseCookieValue(cookieHeader, TOKEN_COOKIE_NAME);
  const userCookie = parseCookieValue(cookieHeader, USER_COOKIE_NAME);

  if (isAuthorizedPublisherCookie(tokenCookie) || decodePayload(userCookie)) {
    return null;
  }

  return NextResponse.json({ error: "Publisher access required." }, { status: 401 });
}

export function getPublisherUserFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const userCookie = parseCookieValue(cookieHeader, USER_COOKIE_NAME);
  const payload = decodePayload(userCookie);

  if (!payload) {
    return null;
  }

  return {
    username: payload.username,
    displayName: payload.displayName,
    githubLogin: payload.githubLogin ?? null,
    githubId: payload.githubId ?? null,
    avatarUrl: payload.avatarUrl ?? null,
  } satisfies PublisherUser;
}

export function getPublisherActorFromRequest(request: Request): PublisherRequestActor {
  const user = getPublisherUserFromRequest(request);
  if (user) {
    return {
      kind: "user",
      user,
    };
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const tokenCookie = parseCookieValue(cookieHeader, TOKEN_COOKIE_NAME);

  if (isAuthorizedPublisherCookie(tokenCookie)) {
    return {
      kind: "token",
    };
  }

  return {
    kind: "anonymous",
  };
}

export function createPublisherTokenSessionResponse() {
  assertPublisherSessionSecret();
  const sessionValue = signTokenCookieValue();
  const response = NextResponse.json({ ok: true });

  if (sessionValue) {
    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: sessionValue,
      ...makeCookieOptions(60 * 60 * 12),
    });
  }

  return response;
}

export function createPublisherUserSessionResponse(user: PublisherUser, redirectTo?: string) {
  assertPublisherSessionSecret();
  const sessionValue = encodePayload({
    username: user.username,
    displayName: user.displayName,
    githubLogin: user.githubLogin ?? null,
    githubId: user.githubId ?? null,
    avatarUrl: user.avatarUrl ?? null,
    issuedAt: Date.now(),
  });

  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, getBaseUrl()))
    : NextResponse.json({ ok: true });

  if (sessionValue) {
    response.cookies.set({
      name: USER_COOKIE_NAME,
      value: sessionValue,
      ...makeCookieOptions(60 * 60 * 24 * 7),
    });
  }

  return response;
}

export function clearPublisherSessionResponse(redirectTo?: string) {
  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, getBaseUrl()))
    : NextResponse.json({ ok: true });

  for (const cookieName of [TOKEN_COOKIE_NAME, USER_COOKIE_NAME, GITHUB_STATE_COOKIE_NAME]) {
    response.cookies.set({
      name: cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
  }

  return response;
}

export function createGitHubState() {
  const value = randomBytes(24).toString("hex");
  const signature = createSignature(value);
  if (!signature) {
    return null;
  }
  return `${value}.${signature}`;
}

export function verifyGitHubState(value: string | undefined) {
  if (!value) {
    return false;
  }

  const [raw, signature] = value.split(".");
  if (!raw || !signature) {
    return false;
  }

  const expected = createSignature(raw);
  if (!expected) {
    return false;
  }

  return safeEqual(signature, expected);
}

export function createGitHubStartResponse(state: string, authUrl: string) {
  const response = NextResponse.redirect(authUrl);
  response.cookies.set({
    name: GITHUB_STATE_COOKIE_NAME,
    value: state,
    ...makeCookieOptions(60 * 10),
  });
  return response;
}

export async function exchangeGitHubCodeForUser(code: string) {
  const clientId = getGitHubClientId();
  const clientSecret = getGitHubClientSecret();
  const baseUrl = getBaseUrl();

  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth is not configured.");
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "WorkflowHub",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${baseUrl}/api/auth/github/callback`,
    }),
    cache: "no-store",
  });

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; error_description?: string };
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || "Failed to exchange GitHub OAuth code.");
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenPayload.access_token}`,
      "User-Agent": "WorkflowHub",
    },
    cache: "no-store",
  });

  const userPayload = (await userResponse.json()) as {
    id?: number;
    login?: string;
    name?: string;
    avatar_url?: string;
  };

  if (!userResponse.ok || !userPayload.login || !userPayload.id) {
    throw new Error("Failed to load the authenticated GitHub user.");
  }

  return {
    githubId: String(userPayload.id),
    githubLogin: userPayload.login,
    username: userPayload.login,
    displayName: userPayload.name?.trim() || userPayload.login,
    avatarUrl: userPayload.avatar_url ?? null,
  } satisfies PublisherUser;
}

export { isGitHubAuthEnabled, isPublisherAuthEnabled };
