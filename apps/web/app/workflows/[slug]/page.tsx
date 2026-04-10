import { notFound } from "next/navigation";
import { getWorkflowBySlug } from "@/lib/registry";

export const dynamic = "force-dynamic";

type WorkflowDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const { slug } = await params;
  const workflow = await getWorkflowBySlug(slug);

  if (!workflow) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="section-block detail-hero">
        <div>
          <p className="eyebrow">{workflow.author.displayName}</p>
          <h1>{workflow.name}</h1>
          <p className="hero-body">{workflow.description}</p>
        </div>

        <div className="install-card">
          <span className="version-pill">v{workflow.latestVersion}</span>
          <strong>Install locally</strong>
          <pre>{`workflowhub install ${workflow.slug}`}</pre>
          <pre>{`workflowhub install ${workflow.slug}@${workflow.latestVersion}`}</pre>
          <pre>{`workflowhub inspect ${workflow.slug}`}</pre>
          <p>{`GET /api/install/${workflow.slug}`}</p>
          <p>{`GET /api/install/${workflow.slug}/${workflow.latestVersion}`}</p>
          <p>Compatible with {workflow.runtimeFamilies.join(", ")} runtimes.</p>
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-card">
          <h2>Workflow steps</h2>
          <div className="step-list">
            {workflow.steps.map((step) => (
              <div key={step.id} className="step-card">
                <span className="step-badge">{step.title}</span>
                <p>{step.instruction}</p>
                {step.tool ? <small>{step.tool}</small> : null}
              </div>
            ))}
          </div>
        </article>

        <aside className="detail-sidebar">
          <article className="detail-card">
            <h2>Metadata</h2>
            <ul className="flat-list">
              <li>License: {workflow.license}</li>
              <li>Updated: {workflow.updatedAt}</li>
              <li>Installs: {workflow.installCount.toLocaleString()}</li>
              <li>Favorites: {workflow.favoriteCount.toLocaleString()}</li>
            </ul>
          </article>

          <article className="detail-card">
            <h2>Required tools</h2>
            <div className="pill-row">
              {workflow.requiredTools.map((tool) => (
                <span key={tool} className="meta-pill">
                  {tool}
                </span>
              ))}
            </div>
          </article>

          <article className="detail-card">
            <h2>Versions</h2>
            <div className="version-timeline">
              {workflow.versions.map((version, index) => (
                <article key={version.version} className="version-card">
                  <div className="version-card-top">
                    <span className="version-pill">{index === 0 ? `Latest · v${version.version}` : `v${version.version}`}</span>
                    <small>{version.publishedAt}</small>
                  </div>
                  <p>{version.changelog}</p>
                </article>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
