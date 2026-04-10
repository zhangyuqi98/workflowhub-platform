import type {
  PublishedWorkflowBundle,
  PublishedWorkflowManifest,
  RuntimeFamily,
  WorkflowFileArtifact,
  WorkflowInstallMetadata,
  WorkflowVersionInstallEntry,
} from "@schema/types";

type ArtifactStepInput = {
  stepKey: string;
  title: string;
  instruction: string;
  tool: string | null;
};

type WorkflowArtifactInput = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  version: string;
  license: string;
  changelog: string;
  tags: string[];
  keywords: string[];
  requiredTools: string[];
  runtimeFamilies: RuntimeFamily[];
  publisherUsername: string;
  publisherDisplayName: string;
  steps: ArtifactStepInput[];
  publishedAt?: Date;
};

type InstallMetadataInput = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  latestVersion: string;
  runtimeFamilies: RuntimeFamily[];
  requiredTools: string[];
  author: {
    username: string;
    displayName: string;
  };
  versions: Array<{
    version: string;
    publishedAt: Date;
    changelog: string;
  }>;
  baseUrl: string;
};

function dedupe(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.trim())));
}

export function buildWorkflowArtifacts(input: WorkflowArtifactInput) {
  const publishedAt = input.publishedAt ?? new Date();
  const toolPreferences = dedupe([
    ...input.requiredTools,
    ...input.steps.map((step) => step.tool),
  ]).map((tool) => ({
    tool,
    purpose: "",
  }));

  const manifest: PublishedWorkflowManifest = {
    format: "workflowhub-manifest@v1",
    slug: input.slug,
    name: input.name,
    summary: input.summary,
    description: input.description,
    publishedVersion: input.version,
    license: input.license,
    changelog: input.changelog,
    publishedAt: publishedAt.toISOString(),
    author: {
      username: input.publisherUsername,
      displayName: input.publisherDisplayName,
    },
    tags: input.tags,
    keywords: input.keywords,
    runtimeFamilies: input.runtimeFamilies,
    requiredTools: input.requiredTools,
  };

  const workflow: WorkflowFileArtifact = {
    id: input.slug,
    name: input.name,
    summary: input.summary,
    match: {
      keywords: input.keywords,
    },
    steps: input.steps.map((step) => ({
      id: step.stepKey,
      title: step.title,
      instruction: step.instruction,
    })),
    tool_preferences: toolPreferences,
    version: 1,
  };

  const readmeMarkdown = [
    `# ${input.name}`,
    "",
    input.description,
    "",
    `Published version: \`${input.version}\``,
    `License: \`${input.license}\``,
    `Compatible runtimes: ${input.runtimeFamilies.join(", ")}`,
    "",
    "## Steps",
    "",
    ...input.steps.map((step, index) => `${index + 1}. ${step.title}: ${step.instruction}`),
  ].join("\n");

  return {
    manifestJson: manifest,
    workflowJson: workflow,
    readmeMarkdown,
  };
}

export function buildPublishedWorkflowBundle(
  manifest: PublishedWorkflowManifest,
  workflow: WorkflowFileArtifact,
  readmeMarkdown: string
): PublishedWorkflowBundle {
  return {
    bundleFormat: "workflowhub-bundle@v1",
    manifest,
    workflow,
    readme: readmeMarkdown,
  };
}

export function buildInstallArtifactUrl(baseUrl: string, slug: string, version: string) {
  return new URL(`/api/install/${encodeURIComponent(slug)}/${encodeURIComponent(version)}`, baseUrl).toString();
}

export function buildInstallMetadata(input: InstallMetadataInput): WorkflowInstallMetadata {
  const versions: WorkflowVersionInstallEntry[] = input.versions.map((version) => {
    const artifactUrl = buildInstallArtifactUrl(input.baseUrl, input.slug, version.version);

    return {
      version: version.version,
      publishedAt: version.publishedAt.toISOString(),
      changelog: version.changelog,
      artifactUrl,
      manifestUrl: `${artifactUrl}?format=manifest`,
      workflowUrl: `${artifactUrl}?format=workflow`,
    };
  });

  return {
    slug: input.slug,
    name: input.name,
    summary: input.summary,
    description: input.description,
    latestVersion: input.latestVersion,
    author: input.author,
    runtimeFamilies: input.runtimeFamilies,
    requiredTools: input.requiredTools,
    installCommand: `workflowhub install ${input.slug}`,
    versions,
  };
}
