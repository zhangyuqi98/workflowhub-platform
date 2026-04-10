export type RuntimeFamily = "openclaw" | "codex" | "generic";

export type WorkflowVersion = {
  version: string;
  publishedAt: string;
  changelog: string;
};

export type PublishedWorkflowManifest = {
  format: "workflowhub-manifest@v1";
  slug: string;
  name: string;
  summary: string;
  description: string;
  publishedVersion: string;
  license: string;
  changelog: string;
  publishedAt: string;
  author: {
    username: string;
    displayName: string;
  };
  tags: string[];
  keywords: string[];
  runtimeFamilies: RuntimeFamily[];
  requiredTools: string[];
};

export type WorkflowFileArtifact = {
  id: string;
  name: string;
  summary: string;
  match: {
    keywords: string[];
  };
  steps: Array<{
    id: string;
    title: string;
    instruction: string;
  }>;
  tool_preferences: Array<{
    tool: string;
    purpose: string;
  }>;
  version: number;
};

export type PublishedWorkflowBundle = {
  bundleFormat: "workflowhub-bundle@v1";
  manifest: PublishedWorkflowManifest;
  workflow: WorkflowFileArtifact;
  readme: string;
};

export type WorkflowVersionInstallEntry = {
  version: string;
  publishedAt: string;
  changelog: string;
  artifactUrl: string;
  manifestUrl: string;
  workflowUrl: string;
};

export type WorkflowInstallMetadata = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  latestVersion: string;
  author: {
    username: string;
    displayName: string;
  };
  runtimeFamilies: RuntimeFamily[];
  requiredTools: string[];
  installCommand: string;
  versions: WorkflowVersionInstallEntry[];
};

export type WorkflowStep = {
  id: string;
  title: string;
  instruction: string;
  tool?: string;
};

export type WorkflowListing = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  author: {
    username: string;
    displayName: string;
  };
  tags: string[];
  keywords: string[];
  runtimeFamilies: RuntimeFamily[];
  requiredTools: string[];
  installCount: number;
  favoriteCount: number;
  latestVersion: string;
  updatedAt: string;
  license: string;
  steps: WorkflowStep[];
  versions: WorkflowVersion[];
};

export type WorkflowQuery = {
  q?: string;
  tag?: string;
  runtime?: RuntimeFamily;
  tool?: string;
};

export type WorkflowListResponse = {
  items: WorkflowListing[];
  total: number;
  filters: WorkflowQuery;
};

export type TagSummary = {
  tag: string;
  count: number;
};

export type AuthorProfile = {
  username: string;
  displayName: string;
  bio: string;
  workflows: WorkflowListing[];
};

export type RegistryStats = {
  workflowCount: number;
  authorCount: number;
  installCount: number;
};
