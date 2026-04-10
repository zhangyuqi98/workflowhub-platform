import type { RuntimeFamily } from "@schema/types";
import { slugifyWorkflowName, splitCommaSeparated } from "@/lib/workflow-utils";

export type PublishStepInput = {
  title?: string;
  instruction?: string;
  tool?: string;
};

export type PublishWorkflowInput = {
  publisherUsername?: string;
  publisherDisplayName?: string;
  name?: string;
  slug?: string;
  summary?: string;
  description?: string;
  version?: string;
  license?: string;
  tags?: string;
  keywords?: string;
  requiredTools?: string;
  changelog?: string;
  runtimeFamilies?: RuntimeFamily[];
  steps?: PublishStepInput[];
};

type ValidateOptions = {
  requireChangelog?: boolean;
};

export function validatePublishPayload(payload: PublishWorkflowInput, options: ValidateOptions = {}) {
  const { requireChangelog = true } = options;

  if (!payload.publisherUsername?.trim()) {
    return "Publisher username is required.";
  }
  if (!payload.publisherDisplayName?.trim()) {
    return "Publisher display name is required.";
  }
  if (!payload.name?.trim()) {
    return "Workflow name is required.";
  }
  if (!payload.summary?.trim()) {
    return "Workflow summary is required.";
  }
  if (!payload.description?.trim()) {
    return "Workflow description is required.";
  }
  if (!payload.version?.trim()) {
    return "Version is required.";
  }
  if (!payload.license?.trim()) {
    return "License is required.";
  }
  if (requireChangelog && !payload.changelog?.trim()) {
    return "Version changelog is required.";
  }
  if (!payload.runtimeFamilies?.length) {
    return "Select at least one runtime family.";
  }

  const steps = (payload.steps ?? []).filter((step) => step.title?.trim() && step.instruction?.trim());
  if (!steps.length) {
    return "Add at least one valid workflow step.";
  }

  return null;
}

export function normalizePublishPayload(payload: PublishWorkflowInput) {
  const steps = (payload.steps ?? []).filter((step) => step.title?.trim() && step.instruction?.trim());

  return {
    publisherUsername: payload.publisherUsername!.trim(),
    publisherDisplayName: payload.publisherDisplayName!.trim(),
    name: payload.name!.trim(),
    slug: slugifyWorkflowName(payload.slug?.trim() || payload.name!.trim()),
    summary: payload.summary!.trim(),
    description: payload.description!.trim(),
    version: payload.version!.trim(),
    license: payload.license!.trim(),
    changelog: payload.changelog!.trim(),
    tags: splitCommaSeparated(payload.tags ?? ""),
    keywords: splitCommaSeparated(payload.keywords ?? ""),
    requiredTools: splitCommaSeparated(payload.requiredTools ?? ""),
    runtimeFamilies: payload.runtimeFamilies!,
    steps: steps.map((step, index) => ({
      stepKey: `step-${index + 1}`,
      position: index + 1,
      title: step.title!.trim(),
      instruction: step.instruction!.trim(),
      tool: step.tool?.trim() || null,
    })),
  };
}
