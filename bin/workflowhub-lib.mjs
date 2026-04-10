import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const RECEIPT_SCHEMA_VERSION = 1;
const DEFAULT_BASE_URL = "http://127.0.0.1:3001";
const DEFAULT_INSTALL_SOURCE = "workflowhub-cli";

function normalizeBaseUrl(value) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export function resolveInstallDir(explicitDir) {
  if (explicitDir) {
    return path.resolve(explicitDir);
  }

  if (process.env.WORKFLOWHUB_INSTALL_DIR) {
    return path.resolve(process.env.WORKFLOWHUB_INSTALL_DIR);
  }

  if (process.env.CODEX_HOME) {
    return path.join(process.env.CODEX_HOME, "workflowhub", "workflows");
  }

  return path.join(os.homedir(), ".workflowhub", "workflows");
}

function receiptRoot(installDir) {
  return path.join(installDir, ".workflowhub", "installs");
}

function receiptDir(installDir, slug) {
  return path.join(receiptRoot(installDir), slug);
}

function receiptPath(installDir, slug) {
  return path.join(receiptDir(installDir, slug), "receipt.json");
}

function manifestPath(installDir, slug) {
  return path.join(receiptDir(installDir, slug), "manifest.json");
}

function readmePath(installDir, slug) {
  return path.join(receiptDir(installDir, slug), "README.md");
}

function workflowPath(installDir, slug) {
  return path.join(installDir, `${slug}.json`);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function parseCommandArgs(argv) {
  const options = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
      continue;
    }

    options[key] = true;
  }

  return { options, positionals };
}

export function parseWorkflowSpecifier(specifier) {
  const trimmed = specifier.trim();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex <= 0) {
    return {
      slug: trimmed,
      version: null,
      pinned: false,
    };
  }

  return {
    slug: trimmed.slice(0, atIndex),
    version: trimmed.slice(atIndex + 1),
    pinned: true,
  };
}

function splitVersion(value) {
  return value
    .split(/[.+-]/)
    .map((segment) => {
      const parsed = Number.parseInt(segment, 10);
      return Number.isNaN(parsed) ? segment : parsed;
    });
}

export function compareVersions(left, right) {
  const leftParts = splitVersion(left);
  const rightParts = splitVersion(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index] ?? 0;
    const b = rightParts[index] ?? 0;
    if (typeof a === "number" && typeof b === "number") {
      if (a !== b) {
        return a - b;
      }
      continue;
    }

    const comparison = String(a).localeCompare(String(b));
    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "error" in body ? body.error : `${response.status} ${response.statusText}`;
    throw new Error(`Request failed for ${url}: ${detail}`);
  }

  return body;
}

export async function fetchInstallMetadata({ baseUrl, slug }) {
  return fetchJson(`${normalizeBaseUrl(baseUrl)}/api/install/${encodeURIComponent(slug)}`);
}

async function fetchWorkflowBundle({ baseUrl, slug, version }) {
  return fetchJson(
    `${normalizeBaseUrl(baseUrl)}/api/install/${encodeURIComponent(slug)}/${encodeURIComponent(version)}`
  );
}

async function recordInstall({ baseUrl, slug, version, runtimeFamily, installSource }) {
  try {
    return await fetchJson(
      `${normalizeBaseUrl(baseUrl)}/api/install/${encodeURIComponent(slug)}/${encodeURIComponent(version)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runtimeFamily,
          installSource: installSource ?? DEFAULT_INSTALL_SOURCE,
        }),
      }
    );
  } catch {
    return null;
  }
}

export async function readReceipts(installDir) {
  const root = receiptRoot(installDir);
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const receipts = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const filePath = path.join(root, entry.name, "receipt.json");
      try {
        const content = await fs.readFile(filePath, "utf8");
        receipts.push(JSON.parse(content));
      } catch {
        // Skip invalid receipts instead of failing the whole list.
      }
    }

    return receipts.sort((left, right) => left.slug.localeCompare(right.slug));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeInstallReceipt({ installDir, slug, receipt, bundle }) {
  const stateDir = receiptDir(installDir, slug);
  await ensureDir(installDir);
  await ensureDir(stateDir);

  await fs.writeFile(workflowPath(installDir, slug), JSON.stringify(bundle.workflow, null, 2) + "\n", "utf8");
  await fs.writeFile(manifestPath(installDir, slug), JSON.stringify(bundle.manifest, null, 2) + "\n", "utf8");
  await fs.writeFile(readmePath(installDir, slug), `${bundle.readme}\n`, "utf8");
  await fs.writeFile(receiptPath(installDir, slug), JSON.stringify(receipt, null, 2) + "\n", "utf8");
}

function selectVersionEntry(metadata, requestedVersion) {
  if (!requestedVersion) {
    return metadata.versions.find((item) => item.version === metadata.latestVersion) ?? metadata.versions[0];
  }

  return metadata.versions.find((item) => item.version === requestedVersion) ?? null;
}

export async function installWorkflow({
  slug,
  requestedVersion = null,
  installDir,
  baseUrl,
  runtimeFamily,
  pinned = false,
}) {
  const metadata = await fetchInstallMetadata({ baseUrl, slug });
  const versionEntry = selectVersionEntry(metadata, requestedVersion);

  if (!versionEntry) {
    throw new Error(
      `Version ${requestedVersion} is not available for ${slug}. Available: ${metadata.versions
        .map((item) => item.version)
        .join(", ")}`
    );
  }

  const bundle = await fetchWorkflowBundle({
    baseUrl,
    slug,
    version: versionEntry.version,
  });

  const receipt = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    slug,
    name: metadata.name,
    installedVersion: versionEntry.version,
    pinned,
    runtimeFamily: runtimeFamily ?? null,
    installedAt: new Date().toISOString(),
    workflowPath: workflowPath(installDir, slug),
    source: {
      baseUrl: normalizeBaseUrl(baseUrl),
      installMetadataUrl: `${normalizeBaseUrl(baseUrl)}/api/install/${encodeURIComponent(slug)}`,
      artifactUrl: versionEntry.artifactUrl,
      manifestUrl: versionEntry.manifestUrl,
      workflowUrl: versionEntry.workflowUrl,
    },
    author: metadata.author,
  };

  await writeInstallReceipt({
    installDir,
    slug,
    receipt,
    bundle,
  });

  const telemetry = await recordInstall({
    baseUrl,
    slug,
    version: versionEntry.version,
    runtimeFamily,
    installSource: DEFAULT_INSTALL_SOURCE,
  });

  return {
    metadata,
    version: versionEntry.version,
    receipt,
    telemetry,
  };
}

export async function listInstalledWorkflows({ installDir }) {
  return readReceipts(installDir);
}

export async function inspectWorkflow({
  slug,
  installDir,
  baseUrl,
}) {
  const [metadata, receipts] = await Promise.all([
    fetchInstallMetadata({ baseUrl, slug }),
    readReceipts(installDir),
  ]);
  const installed = receipts.find((item) => item.slug === slug) ?? null;

  return {
    metadata,
    installed,
  };
}

export async function removeInstalledWorkflow({ slug, installDir }) {
  const receipts = await readReceipts(installDir);
  const receipt = receipts.find((item) => item.slug === slug) ?? null;
  const targets = [
    workflowPath(installDir, slug),
    receiptDir(installDir, slug),
  ];

  const removedPaths = [];
  for (const target of targets) {
    if (await pathExists(target)) {
      await fs.rm(target, { recursive: true, force: true });
      removedPaths.push(target);
    }
  }

  if (!removedPaths.length) {
    throw new Error(`No installed workflow files found for ${slug}.`);
  }

  return {
    slug,
    receipt,
    removedPaths,
  };
}

export async function updateWorkflow({
  slug,
  installDir,
  baseUrl,
  runtimeFamily,
}) {
  const receipts = await readReceipts(installDir);
  const receipt = receipts.find((item) => item.slug === slug);

  if (!receipt) {
    throw new Error(`No installed workflow found for ${slug}.`);
  }

  if (receipt.pinned) {
    return {
      slug,
      status: "pinned",
      installedVersion: receipt.installedVersion,
    };
  }

  const effectiveBaseUrl = normalizeBaseUrl(baseUrl || receipt.source?.baseUrl);
  const metadata = await fetchInstallMetadata({
    baseUrl: effectiveBaseUrl,
    slug,
  });
  const latestVersion = metadata.latestVersion;

  if (compareVersions(latestVersion, receipt.installedVersion) <= 0) {
    return {
      slug,
      status: "current",
      installedVersion: receipt.installedVersion,
      latestVersion,
    };
  }

  const result = await installWorkflow({
    slug,
    requestedVersion: latestVersion,
    installDir,
    baseUrl: effectiveBaseUrl,
    runtimeFamily: runtimeFamily ?? receipt.runtimeFamily ?? null,
    pinned: false,
  });

  return {
    slug,
    status: "updated",
    installedVersion: receipt.installedVersion,
    latestVersion,
    result,
  };
}

export async function updateAllWorkflows({
  installDir,
  baseUrl,
  runtimeFamily,
}) {
  const receipts = await readReceipts(installDir);
  const results = [];

  for (const receipt of receipts) {
    results.push(
      await updateWorkflow({
        slug: receipt.slug,
        installDir,
        baseUrl: baseUrl || receipt.source?.baseUrl,
        runtimeFamily: runtimeFamily ?? receipt.runtimeFamily ?? null,
      })
    );
  }

  return results;
}
