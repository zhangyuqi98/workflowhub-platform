import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteWorkflowButton } from "@/components/delete-workflow-button";
import { PublisherAccessCard } from "@/components/publisher-access-card";
import { getPublisherSessionState } from "@/lib/publisher-auth";
import { getAuthorProfile } from "@/lib/registry";

export const dynamic = "force-dynamic";

type AuthorPageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthorPage({ params, searchParams }: AuthorPageProps) {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const profile = await getAuthorProfile(username);
  const publisherSession = await getPublisherSessionState();

  if (!profile) {
    notFound();
  }

  const created =
    typeof resolvedSearchParams?.created === "string" ? resolvedSearchParams.created : undefined;
  const updated =
    typeof resolvedSearchParams?.updated === "string" ? resolvedSearchParams.updated : undefined;
  const deleted =
    typeof resolvedSearchParams?.deleted === "string" ? resolvedSearchParams.deleted : undefined;

  const totalInstalls = profile.workflows.reduce((sum, workflow) => sum + workflow.installCount, 0);
  const totalFavorites = profile.workflows.reduce((sum, workflow) => sum + workflow.favoriteCount, 0);
  const totalVersions = profile.workflows.reduce((sum, workflow) => sum + workflow.versions.length, 0);
  const canManageProfile =
    publisherSession.authorized &&
    (publisherSession.mode === "token" ||
      !publisherSession.user ||
      publisherSession.user.username === profile.username);

  return (
    <div className="page-stack">
      <section className="section-block publisher-hero">
        <div className="publisher-hero-copy">
          <p className="eyebrow">Publisher Dashboard</p>
          <h1>{profile.displayName}</h1>
          <p className="hero-body">{profile.bio}</p>
        </div>

        <div className="publisher-hero-actions">
          <div className="publisher-identity">
            <span>@{profile.username}</span>
            <span className="publisher-role">owner</span>
          </div>
          <div className="hero-actions">
            {canManageProfile ? (
              <Link className="primary-button" href="/publish">
                Publish workflow
              </Link>
            ) : null}
            <Link className="ghost-button" href="/discover">
              Explore registry
            </Link>
          </div>
        </div>
      </section>

      {publisherSession.enabled && !publisherSession.authorized ? (
        <PublisherAccessCard
          mode={publisherSession.mode === "github" ? "github" : "token"}
          title="Dashboard is in read-only mode"
          body={
            publisherSession.mode === "github"
              ? "Sign in with GitHub to create workflows, edit existing entries, publish new versions, or delete workflows."
              : "Unlock publisher access to create workflows, edit existing entries, publish new versions, or delete workflows."
          }
        />
      ) : null}

      <section className="publisher-stats-grid">
        <article className="stat-card">
          <span>Published workflows</span>
          <strong>{profile.workflows.length}</strong>
        </article>
        <article className="stat-card">
          <span>Total installs</span>
          <strong>{totalInstalls.toLocaleString()}</strong>
        </article>
        <article className="stat-card">
          <span>Total favorites</span>
          <strong>{totalFavorites.toLocaleString()}</strong>
        </article>
        <article className="stat-card">
          <span>Published versions</span>
          <strong>{totalVersions.toLocaleString()}</strong>
        </article>
      </section>

      {created || updated || deleted ? (
        <section className="section-block publisher-banner">
          <p className="eyebrow">{deleted ? "Deleted" : updated ? "Version Published" : "Published"}</p>
          <h2>
            {deleted
              ? `${deleted} has been removed from your dashboard.`
              : `${updated ?? created} is now live in your dashboard.`}
          </h2>
          <p className="hero-body">
            {deleted
              ? "The workflow and its published versions were deleted from the registry."
              : updated
              ? "Your new version is now reflected in the registry metadata below."
              : "You can review it below, publish another version later, or open the public workflow detail page."}
          </p>
        </section>
      ) : null}

      <section className="section-block publisher-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Publisher Workflows</p>
            <h2>Owner-only view for published workflows, visibility, and release actions.</h2>
          </div>
        </div>

        <div className="publisher-table">
          <div className="publisher-table-head">
            <span>Workflow</span>
            <span>Summary</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {profile.workflows.map((workflow) => (
            <article
              key={workflow.slug}
              className={`publisher-row ${
                created === workflow.slug || updated === workflow.slug ? "publisher-row-highlighted" : ""
              }`}
            >
              <div className="publisher-workflow-cell">
                <Link className="publisher-workflow-link" href={`/workflows/${workflow.slug}`}>
                  {workflow.name}
                </Link>
                <span className="publisher-slug">/{workflow.slug}</span>
                <div className="publisher-inline-stats">
                  <span>{workflow.installCount.toLocaleString()} installs</span>
                  <span>{workflow.favoriteCount.toLocaleString()} favorites</span>
                  <span>{workflow.versions.length} versions</span>
                </div>
              </div>

              <p className="publisher-summary-cell">{workflow.summary}</p>

              <div className="publisher-status-cell">
                <span className="publisher-status-pill">Visible</span>
                <small>Updated {workflow.updatedAt}</small>
              </div>

              <div className="publisher-action-cell">
                {canManageProfile ? (
                  <>
                    <Link className="ghost-button" href={`/publish?slug=${encodeURIComponent(workflow.slug)}&action=edit`}>
                      Edit
                    </Link>
                    <Link className="ghost-button" href={`/publish?slug=${encodeURIComponent(workflow.slug)}`}>
                      New version
                    </Link>
                    <DeleteWorkflowButton slug={workflow.slug} username={profile.username} />
                  </>
                ) : null}
                <Link className="card-link" href={`/workflows/${workflow.slug}`}>
                  View
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block publisher-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Publisher Plugins</p>
            <h2>Not part of WorkflowHub Phase 1.</h2>
          </div>
        </div>

        <div className="publisher-empty-card">
          <p className="hero-body">
            WorkflowHub Phase 1 focuses on reusable workflows first. Plugin publishing can be revisited later, but it should not expand the initial scope right now.
          </p>
        </div>
      </section>
    </div>
  );
}
