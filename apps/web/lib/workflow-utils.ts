export function slugifyWorkflowName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "workflow";
}

export function splitCommaSeparated(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
