import { notFound } from "next/navigation";
import { PublishForm } from "@/components/publish-form";
import { PublisherAccessCard } from "@/components/publisher-access-card";
import { getPublisherSessionState } from "@/lib/publisher-auth";
import { getWorkflowBySlug } from "@/lib/registry";

export const dynamic = "force-dynamic";

type PublishPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PublishPage({ searchParams }: PublishPageProps) {
  const publisherSession = await getPublisherSessionState();
  const resolvedSearchParams = await searchParams;
  const slug = typeof resolvedSearchParams?.slug === "string" ? resolvedSearchParams.slug : undefined;
  const action = typeof resolvedSearchParams?.action === "string" ? resolvedSearchParams.action : undefined;
  const initialWorkflow = slug ? await getWorkflowBySlug(slug) : null;

  if (slug && !initialWorkflow) {
    notFound();
  }

  const mode = initialWorkflow ? (action === "edit" ? "edit" : "version") : "create";
  const heading =
    mode === "edit" && initialWorkflow
      ? `Edit ${initialWorkflow.name}`
      : mode === "version" && initialWorkflow
        ? `Publish a new version of ${initialWorkflow.name}`
        : "Publish a reusable workflow";
  const body =
    mode === "edit"
      ? "This edit flow updates the current public metadata, steps, and compatibility fields without creating a new version."
      : mode === "version"
        ? "This release flow starts from an existing workflow, lets you refine its metadata, and appends a new immutable version to the registry."
        : "Phase 1 publishing is metadata-first: define the workflow, version it, and push it into the public registry. Authentication and safety review will come later.";

  return (
    <div className="page-stack">
      <section className="section-block">
        <p className="eyebrow">Publish</p>
        <h1>{heading}</h1>
        <p className="hero-body">{body}</p>
      </section>

      {publisherSession.enabled && !publisherSession.authorized ? (
        <PublisherAccessCard
          mode={publisherSession.mode === "github" ? "github" : "token"}
          body={
            publisherSession.mode === "github"
              ? "Sign in with GitHub to publish workflows, edit metadata, and manage versions."
              : "Enter the publisher token to unlock publishing, editing, and deletion actions."
          }
        />
      ) : (
        <PublishForm mode={mode} initialWorkflow={initialWorkflow} currentPublisher={publisherSession.user} />
      )}
    </div>
  );
}
