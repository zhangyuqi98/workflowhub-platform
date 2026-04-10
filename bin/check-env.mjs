const requiredAlways = ["DATABASE_URL", "WORKFLOWHUB_BASE_URL"];
const requiredIfAny = [
  {
    when: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    requires: ["WORKFLOWHUB_SESSION_SECRET"],
    reason: "GitHub OAuth requires a session secret for signed cookies.",
  },
  {
    when: ["WORKFLOWHUB_PUBLISH_TOKEN"],
    requires: ["WORKFLOWHUB_SESSION_SECRET"],
    reason: "Token-based publisher access requires a session secret for signed cookies.",
  },
];

function read(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function assertVariables() {
  const missing = requiredAlways.filter((name) => !read(name));
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  for (const rule of requiredIfAny) {
    const enabled = rule.when.some((name) => Boolean(read(name)));
    if (!enabled) {
      continue;
    }

    const missingConditional = rule.requires.filter((name) => !read(name));
    if (missingConditional.length) {
      throw new Error(`${rule.reason} Missing: ${missingConditional.join(", ")}`);
    }
  }

  const oauthConfigured = Boolean(read("GITHUB_CLIENT_ID") && read("GITHUB_CLIENT_SECRET"));
  const tokenConfigured = Boolean(read("WORKFLOWHUB_PUBLISH_TOKEN"));
  const rateLimitStore = read("WORKFLOWHUB_RATE_LIMIT_STORE") || "database";

  if (!["database", "memory"].includes(rateLimitStore)) {
    throw new Error("WORKFLOWHUB_RATE_LIMIT_STORE must be either 'database' or 'memory'.");
  }

  if (!oauthConfigured && !tokenConfigured) {
    console.warn(
      "[workflowhub] Publisher access is open because neither GitHub OAuth nor WORKFLOWHUB_PUBLISH_TOKEN is configured."
    );
  }

  console.log("[workflowhub] Environment validation passed.");
}

try {
  assertVariables();
} catch (error) {
  console.error(
    `[workflowhub] ${error instanceof Error ? error.message : "Unknown environment validation error."}`
  );
  process.exit(1);
}
