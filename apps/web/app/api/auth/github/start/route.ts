import { getBaseUrl, getGitHubClientId } from "@/lib/env";
import { createGitHubStartResponse, createGitHubState, isGitHubAuthEnabled } from "@/lib/publisher-auth";

export async function GET() {
  if (!isGitHubAuthEnabled()) {
    return Response.json({ error: "GitHub OAuth is not configured." }, { status: 503 });
  }

  const clientId = getGitHubClientId();
  const state = createGitHubState();

  if (!clientId || !state) {
    return Response.json({ error: "Failed to initialize GitHub OAuth." }, { status: 500 });
  }

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${getBaseUrl()}/api/auth/github/callback`);
  authUrl.searchParams.set("scope", "read:user user:email");
  authUrl.searchParams.set("state", state.split(".")[0]);

  return createGitHubStartResponse(state, authUrl.toString());
}
