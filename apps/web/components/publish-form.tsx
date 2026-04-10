"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RuntimeFamily, WorkflowListing } from "@schema/types";
import { slugifyWorkflowName, splitCommaSeparated } from "@/lib/workflow-utils";
import type { PublisherUser } from "@/lib/publisher-auth";

type StepDraft = {
  title: string;
  instruction: string;
  tool: string;
};

type ImportedWorkflowJson = {
  id?: string;
  slug?: string;
  name?: string;
  summary?: string;
  description?: string;
  license?: string;
  version?: string | number;
  changelog?: string;
  tags?: string[];
  keywords?: string[];
  runtimeFamilies?: string[];
  runtimes?: string[];
  match?: {
    keywords?: string[];
  };
  tool_preferences?: Array<
    | string
    | {
        tool?: string;
        purpose?: string;
      }
  >;
  requiredTools?: string[];
  steps?: Array<{
    id?: string;
    title?: string;
    instruction?: string;
    tool?: string;
  }>;
};

type ParsedImport = {
  sourceLabel: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  version: string;
  license: string;
  tags: string[];
  keywords: string[];
  requiredTools: string[];
  runtimeFamilies: RuntimeFamily[];
  changelog: string;
  steps: StepDraft[];
};

type PublishFormProps = {
  mode?: "create" | "version" | "edit";
  initialWorkflow?: WorkflowListing | null;
  currentPublisher?: PublisherUser | null;
};

type SlugStatus = {
  state: "idle" | "checking" | "available" | "taken";
  message: string | null;
};

type WorkflowJsonPreview = {
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

const runtimeOptions: RuntimeFamily[] = ["openclaw", "codex", "generic"];

function emptyStep(): StepDraft {
  return {
    title: "",
    instruction: "",
    tool: "",
  };
}

function normalizeImportedSteps(workflow: ImportedWorkflowJson): StepDraft[] {
  const importedSteps = workflow.steps ?? [];
  const fallbackTools = (workflow.tool_preferences ?? []).map((item) =>
    typeof item === "string" ? item : item.tool ?? ""
  );

  const normalized = importedSteps
    .map((step, index) => ({
      title: step.title?.trim() ?? "",
      instruction: step.instruction?.trim() ?? "",
      tool: step.tool?.trim() || fallbackTools[index] || "",
    }))
    .filter((step) => step.title || step.instruction || step.tool);

  return normalized.length ? normalized : [emptyStep()];
}

function normalizeImportedRuntimes(workflow: ImportedWorkflowJson): RuntimeFamily[] {
  const raw = workflow.runtimeFamilies ?? workflow.runtimes ?? [];
  const allowed = raw.filter(
    (runtime): runtime is RuntimeFamily =>
      runtime === "openclaw" || runtime === "codex" || runtime === "generic"
  );

  return allowed.length ? allowed : ["openclaw"];
}

function parseImportedWorkflowJson(workflow: ImportedWorkflowJson, sourceLabel: string): ParsedImport {
  if (!workflow.name?.trim()) {
    throw new Error("This JSON does not include a valid workflow name.");
  }

  return {
    sourceLabel,
    name: workflow.name ?? "",
    slug: workflow.slug ?? workflow.id ?? "",
    summary: workflow.summary ?? "",
    description: workflow.description ?? workflow.summary ?? "",
    version: workflow.version ? String(workflow.version) : "0.1.0",
    license: workflow.license ?? "MIT",
    tags: workflow.tags ?? [],
    keywords: workflow.keywords ?? workflow.match?.keywords ?? [],
    requiredTools:
      workflow.requiredTools ??
      (workflow.tool_preferences ?? [])
        .map((item) => (typeof item === "string" ? item : item.tool ?? ""))
        .filter(Boolean),
    runtimeFamilies: normalizeImportedRuntimes(workflow),
    changelog: workflow.changelog ?? "Imported from workflow JSON.",
    steps: normalizeImportedSteps(workflow),
  };
}

function suggestNextVersion(version: string) {
  const segments = version.split(".");
  if (segments.length !== 3) {
    return version;
  }

  const [major, minor, patch] = segments.map((item) => Number.parseInt(item, 10));
  if ([major, minor, patch].some((item) => Number.isNaN(item))) {
    return version;
  }

  return `${major}.${minor}.${patch + 1}`;
}

export function PublishForm({ mode = "create", initialWorkflow = null, currentPublisher = null }: PublishFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [publisherUsername, setPublisherUsername] = useState(
    currentPublisher?.username ?? initialWorkflow?.author.username ?? "linjie"
  );
  const [publisherDisplayName, setPublisherDisplayName] = useState(
    currentPublisher?.displayName ?? initialWorkflow?.author.displayName ?? "Linjie Wu"
  );
  const [name, setName] = useState(initialWorkflow?.name ?? "");
  const [slug, setSlug] = useState(initialWorkflow?.slug ?? "");
  const [summary, setSummary] = useState(initialWorkflow?.summary ?? "");
  const [description, setDescription] = useState(initialWorkflow?.description ?? "");
  const [version, setVersion] = useState(
    initialWorkflow
      ? mode === "version"
        ? suggestNextVersion(initialWorkflow.latestVersion)
        : initialWorkflow.latestVersion
      : "0.1.0"
  );
  const [license, setLicense] = useState(initialWorkflow?.license ?? "MIT");
  const [tags, setTags] = useState(initialWorkflow?.tags.join(", ") ?? "");
  const [keywords, setKeywords] = useState(initialWorkflow?.keywords.join(", ") ?? "");
  const [requiredTools, setRequiredTools] = useState(initialWorkflow?.requiredTools.join(", ") ?? "");
  const [changelog, setChangelog] = useState(
    mode === "version"
      ? "Describe what changed in this release."
      : mode === "edit"
        ? ""
        : "Initial public release."
  );
  const [runtimeFamilies, setRuntimeFamilies] = useState<RuntimeFamily[]>(initialWorkflow?.runtimeFamilies ?? ["openclaw"]);
  const [steps, setSteps] = useState<StepDraft[]>(
    initialWorkflow?.steps.map((step) => ({
      title: step.title,
      instruction: step.instruction,
      tool: step.tool ?? "",
    })) ?? [emptyStep(), emptyStep(), emptyStep()]
  );
  const [jsonInput, setJsonInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ParsedImport | null>(null);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: "idle", message: null });
  const [jsonPreviewStatus, setJsonPreviewStatus] = useState<string | null>(null);
  const [selectedFileLabel, setSelectedFileLabel] = useState("No file selected");

  const slugPreview = useMemo(() => slug || slugifyWorkflowName(name), [name, slug]);
  const effectiveSlug = useMemo(() => slugifyWorkflowName(slug || name), [name, slug]);
  const normalizedKeywords = useMemo(() => splitCommaSeparated(keywords), [keywords]);
  const normalizedRequiredTools = useMemo(() => splitCommaSeparated(requiredTools), [requiredTools]);
  const normalizedSteps = useMemo(
    () =>
      steps
        .filter((step) => step.title.trim() && step.instruction.trim())
        .map((step, index) => ({
          id: `step-${index + 1}`,
          title: step.title.trim() || `Step ${index + 1}`,
          instruction: step.instruction.trim(),
          tool: step.tool.trim() || undefined,
        })),
    [steps]
  );
  const workflowJsonPreview = useMemo<WorkflowJsonPreview>(
    () => ({
      id: effectiveSlug || "new-workflow",
      name: name.trim() || "New Workflow",
      summary: summary.trim() || "Describe the repeated task this workflow should handle.",
      match: {
        keywords: normalizedKeywords,
      },
      tool_preferences: Array.from(
        new Set([
          ...normalizedRequiredTools,
          ...normalizedSteps
            .map((step) => step.tool)
            .filter((tool): tool is string => Boolean(tool)),
        ])
      ).map((tool) => ({
        tool,
        purpose: "",
      })),
      steps: normalizedSteps.length
        ? normalizedSteps.map((step, index) => ({
            id: step.id,
            title: step.title || `Step ${index + 1}`,
            instruction: step.instruction,
          }))
        : [
            {
              id: "step-1",
              title: "First step",
              instruction: "Describe the first meaningful action.",
            },
          ],
      version: 1,
    }),
    [
      effectiveSlug,
      name,
      normalizedKeywords,
      normalizedRequiredTools,
      normalizedSteps,
      summary,
    ]
  );
  const workflowJsonText = useMemo(() => JSON.stringify(workflowJsonPreview, null, 2), [workflowJsonPreview]);
  const validStepCount = useMemo(
    () => steps.filter((step) => step.title.trim() && step.instruction.trim()).length,
    [steps]
  );
  const hasAuthenticatedPublisher = Boolean(currentPublisher);
  const submitBlockedBySlug = mode === "create" && (slugStatus.state === "checking" || slugStatus.state === "taken");
  const submitHelperText =
    mode === "edit"
      ? "Saving only updates the live workflow metadata and step content."
      : mode === "version"
        ? "Publishing creates a new immutable version and refreshes the latest metadata."
        : submitBlockedBySlug
          ? slugStatus.state === "checking"
            ? "Wait for the slug check to finish before publishing."
            : "Pick a different slug or workflow name before publishing."
          : "Publishing will create a new public workflow entry in the registry.";

  useEffect(() => {
    if (mode !== "create") {
      setSlugStatus({
        state: "idle",
        message: mode === "edit" ? "Slug is locked while editing an existing workflow." : "Slug is locked for version updates.",
      });
      return;
    }

    if (!effectiveSlug) {
      setSlugStatus({ state: "idle", message: null });
      return;
    }

    let cancelled = false;
    setSlugStatus({ state: "checking", message: "Checking slug availability..." });

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/workflows?checkSlug=${encodeURIComponent(effectiveSlug)}`);
        const payload = (await response.json()) as { available?: boolean };

        if (cancelled) {
          return;
        }

        if (payload.available) {
          setSlugStatus({ state: "available", message: `${effectiveSlug} is available.` });
        } else {
          setSlugStatus({ state: "taken", message: `${effectiveSlug} is already taken.` });
        }
      } catch {
        if (!cancelled) {
          setSlugStatus({ state: "idle", message: null });
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [effectiveSlug, mode]);

  function updateStep(index: number, key: keyof StepDraft, value: string) {
    setSteps((current) =>
      current.map((step, stepIndex) => (stepIndex === index ? { ...step, [key]: value } : step))
    );
  }

  function addStep() {
    setSteps((current) => [...current, emptyStep()]);
  }

  function removeStep(index: number) {
    setSteps((current) => (current.length > 1 ? current.filter((_, stepIndex) => stepIndex !== index) : current));
  }

  function toggleRuntime(runtime: RuntimeFamily) {
    setRuntimeFamilies((current) => {
      if (current.includes(runtime)) {
        const next = current.filter((item) => item !== runtime);
        return next.length ? next : current;
      }
      return [...current, runtime];
    });
  }

  function applyImportToForm(parsed: ParsedImport) {
    setName(parsed.name);
    setSlug(parsed.slug);
    setSummary(parsed.summary);
    setDescription(parsed.description);
    setVersion(parsed.version);
    setLicense(parsed.license);
    setTags(parsed.tags.join(", "));
    setKeywords(parsed.keywords.join(", "));
    setRequiredTools(parsed.requiredTools.join(", "));
    setRuntimeFamilies(parsed.runtimeFamilies);
    setSteps(parsed.steps);
    setChangelog(parsed.changelog);
    setImportStatus(`Imported ${parsed.sourceLabel} and populated the form.`);
  }

  async function handleJsonImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFileLabel("No file selected");
      return;
    }

    try {
      setErrorMessage(null);
      setImportStatus(null);
      setSelectedFileLabel(file.name);
      const text = await file.text();
      const parsed = JSON.parse(text) as ImportedWorkflowJson;
      setImportPreview(parseImportedWorkflowJson(parsed, file.name));
    } catch (error) {
      setImportPreview(null);
      setImportStatus(null);
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse the workflow JSON file.");
    } finally {
      event.target.value = "";
    }
  }

  function handlePastedJsonImport() {
    try {
      setErrorMessage(null);
      setImportStatus(null);
      const parsed = JSON.parse(jsonInput) as ImportedWorkflowJson;
      setImportPreview(parseImportedWorkflowJson(parsed, "pasted JSON"));
    } catch (error) {
      setImportPreview(null);
      setImportStatus(null);
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse the pasted JSON.");
    }
  }

  async function handleCopyJsonPreview() {
    try {
      await navigator.clipboard.writeText(workflowJsonText);
      setJsonPreviewStatus("Workflow JSON copied.");
      window.setTimeout(() => setJsonPreviewStatus(null), 1800);
    } catch {
      setJsonPreviewStatus("Failed to copy JSON.");
      window.setTimeout(() => setJsonPreviewStatus(null), 1800);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const filteredSteps = steps.filter((step) => step.title.trim() && step.instruction.trim());

    if (mode === "create" && slugStatus.state === "checking") {
      setErrorMessage("Wait for the slug availability check to finish.");
      setIsSubmitting(false);
      return;
    }

    if (mode === "create" && slugStatus.state === "taken") {
      setErrorMessage("This slug is already taken. Change the workflow name or enter a different slug.");
      setIsSubmitting(false);
      return;
    }

    try {
      const endpoint = mode !== "create" && initialWorkflow ? `/api/workflows/${initialWorkflow.slug}` : "/api/workflows";
      const method =
        mode === "edit" && initialWorkflow ? "PUT" : mode === "version" && initialWorkflow ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publisherUsername,
          publisherDisplayName,
          name,
          slug: slug || undefined,
          summary,
          description,
          version,
          license,
          tags,
          keywords,
          requiredTools,
          changelog,
          runtimeFamilies,
          steps: filteredSteps,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 409 && mode === "create") {
          setSlugStatus({ state: "taken", message: `${effectiveSlug} is already taken.` });
        }
        setErrorMessage(payload.error ?? "Failed to publish workflow.");
        return;
      }

      const flag = mode === "create" ? "created" : "updated";
      router.push(`/users/${publisherUsername}?${flag}=${encodeURIComponent(payload.slug)}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to publish workflow.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="publish-form" onSubmit={handleSubmit}>
      <section className="detail-card publish-section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Import</p>
            <h2>Upload an existing workflow JSON</h2>
          </div>
        </div>

        <div className="publish-import-card">
          <label className="field-group">
            <span>Workflow JSON file</span>
            <input
              ref={fileInputRef}
              className="sr-only-input"
              type="file"
              accept="application/json,.json"
              onChange={handleJsonImport}
            />
            <div className="file-picker-row">
              <button className="ghost-button" type="button" onClick={() => fileInputRef.current?.click()}>
                Choose file
              </button>
              <span className="file-picker-label">{selectedFileLabel}</span>
            </div>
            <small>Supports your current local workflow schema and will auto-fill the form below.</small>
          </label>
          <label className="field-group">
            <span>Paste workflow JSON</span>
            <textarea
              value={jsonInput}
              onChange={(event) => setJsonInput(event.target.value)}
              rows={8}
              placeholder='{"name":"PR Review","summary":"...","match":{"keywords":["pr","review"]},"steps":[...]}'
            />
          </label>
          <div className="hero-actions">
            <button className="ghost-button" type="button" onClick={handlePastedJsonImport} disabled={!jsonInput.trim()}>
              Parse pasted JSON
            </button>
          </div>
          {importStatus ? <p className="publish-success">{importStatus}</p> : null}
        </div>
      </section>

      {importPreview ? (
        <section className="detail-card publish-section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Import Preview</p>
              <h2>Review parsed workflow data before applying it</h2>
            </div>
            <button className="primary-button" type="button" onClick={() => applyImportToForm(importPreview)}>
              Apply to form
            </button>
          </div>

          <div className="publish-preview-grid">
            <article className="publish-preview-card">
              <span className="version-pill">{importPreview.sourceLabel}</span>
              <h3>{importPreview.name}</h3>
              <p className="workflow-summary">{importPreview.summary || "No summary provided."}</p>
              <div className="pill-row">
                {importPreview.runtimeFamilies.map((runtime) => (
                  <span key={runtime} className="meta-pill">
                    {runtime}
                  </span>
                ))}
              </div>
            </article>

            <article className="publish-preview-card">
              <h3>Metadata</h3>
              <ul className="flat-list">
                <li>Slug: {importPreview.slug || slugifyWorkflowName(importPreview.name)}</li>
                <li>Version: {importPreview.version}</li>
                <li>License: {importPreview.license}</li>
                <li>Steps: {importPreview.steps.length}</li>
                <li>Tools: {importPreview.requiredTools.length || 0}</li>
              </ul>
            </article>

            <article className="publish-preview-card">
              <h3>Keywords</h3>
              <div className="pill-row">
                {importPreview.keywords.length ? (
                  importPreview.keywords.map((keyword) => (
                    <span key={keyword} className="meta-pill">
                      {keyword}
                    </span>
                  ))
                ) : (
                  <span className="workflow-summary">No keywords detected.</span>
                )}
              </div>
            </article>

            <article className="publish-preview-card">
              <h3>Tools</h3>
              <div className="pill-row">
                {importPreview.requiredTools.length ? (
                  importPreview.requiredTools.map((tool) => (
                    <span key={tool} className="meta-pill">
                      {tool}
                    </span>
                  ))
                ) : (
                  <span className="workflow-summary">No tools detected.</span>
                )}
              </div>
            </article>

            <article className="publish-preview-card publish-preview-steps">
              <h3>Step Preview</h3>
              <div className="import-step-list">
                {importPreview.steps.map((step, index) => (
                  <div key={`${step.title}-${index + 1}`} className="import-step-card">
                    <div className="import-step-header">
                      <span className="step-badge">Step {index + 1}</span>
                      {step.tool ? <span className="meta-pill">{step.tool}</span> : null}
                    </div>
                    <strong>{step.title || `Untitled step ${index + 1}`}</strong>
                    <p>{step.instruction || "No instruction provided."}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {hasAuthenticatedPublisher ? (
        <section className="detail-card publish-section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Publisher</p>
              <h2>Authenticated publisher identity</h2>
            </div>
          </div>

          <div className="publish-grid two-up">
            <label className="field-group">
              <span>Username</span>
              <input value={publisherUsername} readOnly />
            </label>
            <label className="field-group">
              <span>Display name</span>
              <input value={publisherDisplayName} readOnly />
            </label>
          </div>
        </section>
      ) : (
        <section className="detail-card publish-section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Publisher</p>
              <h2>Temporary identity until auth lands</h2>
            </div>
          </div>

          <div className="publish-grid two-up">
            <label className="field-group">
              <span>Username</span>
              <input value={publisherUsername} onChange={(event) => setPublisherUsername(event.target.value)} required />
            </label>
            <label className="field-group">
              <span>Display name</span>
              <input
                value={publisherDisplayName}
                onChange={(event) => setPublisherDisplayName(event.target.value)}
                required
              />
            </label>
          </div>
        </section>
      )}

      <section className="detail-card publish-section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workflow</p>
            <h2>
              {mode === "edit"
                ? "Edit the live workflow metadata"
                : mode === "version"
                  ? "Update metadata for the next release"
                  : "Core metadata"}
            </h2>
          </div>
        </div>

        <div className="publish-grid">
          <label className="field-group">
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>

          <label className="field-group">
            <span>Slug</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder={slugPreview}
              readOnly={mode !== "create"}
            />
            <small>
              {mode !== "create"
                ? mode === "edit"
                  ? "Slug is locked while editing an existing workflow."
                  : "Slug is locked for version updates."
                : "Leave blank to auto-generate from the name."}
            </small>
            {slugStatus.message ? (
              <small
                className={
                  slugStatus.state === "taken"
                    ? "field-status field-status-error"
                    : slugStatus.state === "available"
                      ? "field-status field-status-success"
                      : "field-status"
                }
              >
                {slugStatus.message}
              </small>
            ) : null}
          </label>

          <label className="field-group full-span">
            <span>Summary</span>
            <input value={summary} onChange={(event) => setSummary(event.target.value)} required />
          </label>

          <label className="field-group full-span">
            <span>Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} required />
          </label>
        </div>
      </section>

      <section className="detail-card publish-section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Compatibility</p>
            <h2>Version, license, runtimes, and tools</h2>
          </div>
        </div>

        <div className="publish-grid two-up">
          <label className="field-group">
            <span>Version</span>
            <input value={version} onChange={(event) => setVersion(event.target.value)} required readOnly={mode === "edit"} />
          </label>

          <label className="field-group">
            <span>License</span>
            <input value={license} onChange={(event) => setLicense(event.target.value)} required />
          </label>

          <label className="field-group">
            <span>Tags</span>
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="engineering, review, github" />
          </label>

          <label className="field-group">
            <span>Keywords</span>
            <input
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="pr, regression, tests"
            />
          </label>

          <label className="field-group full-span">
            <span>Required tools</span>
            <input
              value={requiredTools}
              onChange={(event) => setRequiredTools(event.target.value)}
              placeholder="github, git"
            />
          </label>

          <div className="field-group full-span">
            <span>Runtime families</span>
            <div className="checkbox-row">
              {runtimeOptions.map((runtime) => (
                <label key={runtime} className="checkbox-pill">
                  <input
                    type="checkbox"
                    checked={runtimeFamilies.includes(runtime)}
                    onChange={() => toggleRuntime(runtime)}
                  />
                  <span>{runtime}</span>
                </label>
              ))}
            </div>
          </div>

          {mode !== "edit" ? (
            <label className="field-group full-span">
              <span>Version changelog</span>
              <textarea value={changelog} onChange={(event) => setChangelog(event.target.value)} rows={3} required />
            </label>
          ) : null}
        </div>
      </section>

      <section className="detail-card publish-section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Steps</p>
            <h2>Structured execution flow</h2>
          </div>
          <button className="ghost-button" type="button" onClick={addStep}>
            Add step
          </button>
        </div>

        <div className="publish-step-list">
          {steps.map((step, index) => (
            <article key={`step-${index + 1}`} className="publish-step-card">
              <div className="publish-step-header">
                <span className="step-badge">Step {index + 1}</span>
                {steps.length > 1 ? (
                  <button className="ghost-button" type="button" onClick={() => removeStep(index)}>
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="publish-grid two-up">
                <label className="field-group">
                  <span>Title</span>
                  <input value={step.title} onChange={(event) => updateStep(index, "title", event.target.value)} />
                </label>

                <label className="field-group">
                  <span>Tool</span>
                  <input value={step.tool} onChange={(event) => updateStep(index, "tool", event.target.value)} />
                </label>

                <label className="field-group full-span">
                  <span>Instruction</span>
                  <textarea
                    value={step.instruction}
                    onChange={(event) => updateStep(index, "instruction", event.target.value)}
                    rows={4}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-card publish-submit-card">
        <div className="publish-submit-copy">
          <h2>{mode === "edit" ? "Save workflow changes" : "Publish to WorkflowHub"}</h2>
          <p className="hero-body">
            {mode === "edit"
              ? "This updates the current workflow entry without creating a new release."
              : mode === "version"
                ? "This publishes a new version for the selected workflow and updates its latest metadata."
                : "This MVP creates a new public workflow version directly in the registry database."}
          </p>
          <p className="publish-helper">
            {validStepCount} valid step{validStepCount === 1 ? "" : "s"} ready. {submitHelperText}
          </p>
          {errorMessage ? <p className="publish-error">{errorMessage}</p> : null}
        </div>

        <div className="hero-actions">
          <button className="primary-button" type="submit" disabled={isSubmitting || submitBlockedBySlug}>
            {isSubmitting
              ? mode === "edit"
                ? "Saving..."
                : "Publishing..."
              : mode === "edit"
                ? "Save changes"
                : mode === "version"
                  ? "Publish new version"
                  : "Publish workflow"}
          </button>
        </div>
      </section>

      <section className="detail-card publish-section-card">
        <details className="publish-json-details">
          <summary className="publish-json-summary">
            <div>
              <p className="eyebrow">JSON Preview</p>
              <h2>View the workflow JSON generated from the form</h2>
            </div>
          </summary>

          <div className="publish-json-card">
            <p className="hero-body">
              This preview follows the local workflow file schema exactly: `id`, `name`, `summary`, `match`, `steps`, `tool_preferences`, and `version`.
            </p>
            <div className="hero-actions">
              <button className="ghost-button" type="button" onClick={handleCopyJsonPreview}>
                Copy JSON
              </button>
            </div>
            <pre className="publish-json-preview">
              <code>{workflowJsonText}</code>
            </pre>
            {jsonPreviewStatus ? <p className="publish-success">{jsonPreviewStatus}</p> : null}
          </div>
        </details>
      </section>
    </form>
  );
}
