import { getAppRelease, getAppVersion } from "@/lib/env";

type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function write(level: LogLevel, message: string, fields: LogFields = {}) {
  const record = {
    level,
    message,
    service: "workflowhub-web",
    version: getAppVersion(),
    release: getAppRelease() ?? null,
    timestamp: new Date().toISOString(),
    ...fields,
  };

  const payload = JSON.stringify(record);

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

export function logInfo(message: string, fields?: LogFields) {
  write("info", message, fields);
}

export function logWarn(message: string, fields?: LogFields) {
  write("warn", message, fields);
}

export function logError(message: string, fields?: LogFields) {
  write("error", message, fields);
}
