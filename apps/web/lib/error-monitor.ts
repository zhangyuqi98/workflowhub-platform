import { getAppRelease, getAppVersion, getErrorWebhookUrl } from "@/lib/env";
import { logError } from "@/lib/logger";

type ErrorContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : JSON.stringify(error),
    stack: null,
  };
}

export async function reportError(error: unknown, context: ErrorContext = {}) {
  const serialized = serializeError(error);

  logError(serialized.message, {
    errorName: serialized.name,
    stack: serialized.stack,
    ...context,
  });

  const webhookUrl = getErrorWebhookUrl();
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service: "workflowhub-web",
        version: getAppVersion(),
        release: getAppRelease() ?? null,
        timestamp: new Date().toISOString(),
        error: serialized,
        context,
      }),
      cache: "no-store",
    });
  } catch (webhookError) {
    logError("Failed to deliver external error report", {
      originalMessage: serialized.message,
      webhookError: webhookError instanceof Error ? webhookError.message : String(webhookError),
    });
  }
}
