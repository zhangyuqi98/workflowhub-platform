const DEFAULT_BASE_URL = "http://127.0.0.1:3001";
const DEFAULT_DATABASE_URL = "postgresql://workflowhub:workflowhub@127.0.0.1:5432/workflowhub?schema=public";
const DEFAULT_APP_VERSION = "0.1.0";

function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getDatabaseUrl() {
  return readEnv("DATABASE_URL") ?? DEFAULT_DATABASE_URL;
}

export function getBaseUrl() {
  return readEnv("WORKFLOWHUB_BASE_URL") ?? DEFAULT_BASE_URL;
}

export function shouldSkipDatabaseDuringBuild() {
  return readEnv("WORKFLOWHUB_SKIP_DB_DURING_BUILD") === "true";
}

export function getAppVersion() {
  return readEnv("WORKFLOWHUB_APP_VERSION") ?? DEFAULT_APP_VERSION;
}

export function getAppRelease() {
  return readEnv("WORKFLOWHUB_RELEASE_SHA");
}

export function getRateLimitStore() {
  return readEnv("WORKFLOWHUB_RATE_LIMIT_STORE") ?? "database";
}

export function getErrorWebhookUrl() {
  return readEnv("WORKFLOWHUB_ERROR_WEBHOOK_URL");
}

export function getPublisherToken() {
  return readEnv("WORKFLOWHUB_PUBLISH_TOKEN");
}

export function getSessionSecret() {
  return readEnv("WORKFLOWHUB_SESSION_SECRET");
}

export function getGitHubClientId() {
  return readEnv("GITHUB_CLIENT_ID");
}

export function getGitHubClientSecret() {
  return readEnv("GITHUB_CLIENT_SECRET");
}

export function isGitHubAuthEnabled() {
  return Boolean(getGitHubClientId() && getGitHubClientSecret());
}

export function isPublisherAuthEnabled() {
  return Boolean(getPublisherToken());
}

export function assertPublisherSessionSecret() {
  if ((isPublisherAuthEnabled() || isGitHubAuthEnabled()) && !getSessionSecret()) {
    throw new Error(
      "WORKFLOWHUB_SESSION_SECRET is required when publisher token protection or GitHub auth is enabled."
    );
  }
}
