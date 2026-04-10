#!/usr/bin/env node

import {
  inspectWorkflow,
  installWorkflow,
  listInstalledWorkflows,
  parseCommandArgs,
  parseWorkflowSpecifier,
  removeInstalledWorkflow,
  resolveInstallDir,
  updateAllWorkflows,
  updateWorkflow,
} from "./workflowhub-lib.mjs";

function printHelp() {
  console.log(`WorkflowHub CLI

Usage:
  workflowhub install <slug[@version]> [--dir <path>] [--base-url <url>] [--runtime <runtime>]
  workflowhub inspect <slug> [--dir <path>] [--base-url <url>]
  workflowhub list [--dir <path>]
  workflowhub remove <slug> [--dir <path>]
  workflowhub update <slug> [--dir <path>] [--base-url <url>] [--runtime <runtime>]
  workflowhub update --all [--dir <path>] [--base-url <url>] [--runtime <runtime>]

Options:
  --dir       Local workflow install directory
  --base-url  WorkflowHub registry base URL
  --runtime   Runtime family reported for install telemetry
  --all       Update every non-pinned installed workflow
  --help      Show this help
`);
}

function printList(receipts, installDir) {
  if (!receipts.length) {
    console.log(`No installed workflows found in ${installDir}`);
    return;
  }

  console.log(`Installed workflows in ${installDir}`);
  for (const receipt of receipts) {
    const mode = receipt.pinned ? "pinned" : "tracking latest";
    console.log(`- ${receipt.slug} v${receipt.installedVersion} (${mode})`);
    console.log(`  ${receipt.workflowPath}`);
  }
}

function printInspect(result) {
  const { metadata, installed } = result;
  console.log(`${metadata.name} (${metadata.slug})`);
  console.log(metadata.summary);
  console.log(`Author: ${metadata.author.displayName} (@${metadata.author.username})`);
  console.log(`Latest version: v${metadata.latestVersion}`);
  console.log(`Runtimes: ${metadata.runtimeFamilies.join(", ") || "none"}`);
  console.log(`Tools: ${metadata.requiredTools.join(", ") || "none"}`);
  if (installed) {
    const mode = installed.pinned ? "pinned" : "tracking latest";
    console.log(`Installed locally: v${installed.installedVersion} (${mode})`);
    console.log(installed.workflowPath);
  } else {
    console.log("Installed locally: no");
  }
  console.log("Available versions:");
  for (const version of metadata.versions) {
    console.log(`- v${version.version} (${version.publishedAt})`);
    console.log(`  ${version.changelog}`);
  }
}

async function run() {
  const [command, ...rest] = process.argv.slice(2);
  const { options, positionals } = parseCommandArgs(rest);
  const installDir = resolveInstallDir(options.dir);
  const baseUrl = options["base-url"];
  const runtimeFamily = typeof options.runtime === "string" ? options.runtime : undefined;

  if (!command || command === "--help" || command === "help") {
    printHelp();
    return;
  }

  if (command === "install") {
    const specifier = positionals[0];
    if (!specifier) {
      throw new Error("Missing workflow slug. Example: workflowhub install pr-review-risk-first");
    }

    const parsed = parseWorkflowSpecifier(specifier);
    const result = await installWorkflow({
      slug: parsed.slug,
      requestedVersion: parsed.version,
      installDir,
      baseUrl,
      runtimeFamily,
      pinned: parsed.pinned,
    });

    console.log(`Installed ${parsed.slug} v${result.version}`);
    console.log(result.receipt.workflowPath);
    if (result.telemetry?.installCount) {
      console.log(`Registry install count: ${result.telemetry.installCount}`);
    }
    return;
  }

  if (command === "list") {
    const receipts = await listInstalledWorkflows({ installDir });
    printList(receipts, installDir);
    return;
  }

  if (command === "inspect") {
    const slug = positionals[0];
    if (!slug) {
      throw new Error("Missing workflow slug. Example: workflowhub inspect pr-review-risk-first");
    }

    const result = await inspectWorkflow({
      slug,
      installDir,
      baseUrl,
    });
    printInspect(result);
    return;
  }

  if (command === "remove") {
    const slug = positionals[0];
    if (!slug) {
      throw new Error("Missing workflow slug. Example: workflowhub remove pr-review-risk-first");
    }

    const result = await removeInstalledWorkflow({
      slug,
      installDir,
    });
    console.log(`Removed ${result.slug}`);
    for (const removedPath of result.removedPaths) {
      console.log(removedPath);
    }
    return;
  }

  if (command === "update") {
    if (options.all) {
      const results = await updateAllWorkflows({
        installDir,
        baseUrl,
        runtimeFamily,
      });

      if (!results.length) {
        console.log(`No installed workflows found in ${installDir}`);
        return;
      }

      for (const result of results) {
        if (result.status === "updated") {
          console.log(`Updated ${result.slug}: ${result.installedVersion} -> ${result.latestVersion}`);
          continue;
        }

        if (result.status === "current") {
          console.log(`${result.slug} is already current at v${result.installedVersion}`);
          continue;
        }

        if (result.status === "pinned") {
          console.log(`${result.slug} is pinned at v${result.installedVersion}; skipping`);
        }
      }
      return;
    }

    const slug = positionals[0];
    if (!slug) {
      throw new Error("Missing workflow slug. Example: workflowhub update pr-review-risk-first");
    }

    const result = await updateWorkflow({
      slug,
      installDir,
      baseUrl,
      runtimeFamily,
    });

    if (result.status === "updated") {
      console.log(`Updated ${result.slug}: ${result.installedVersion} -> ${result.latestVersion}`);
      return;
    }

    if (result.status === "current") {
      console.log(`${result.slug} is already current at v${result.installedVersion}`);
      return;
    }

    if (result.status === "pinned") {
      console.log(`${result.slug} is pinned at v${result.installedVersion}; skipping`);
      return;
    }
  }

  throw new Error(`Unknown command: ${command}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
