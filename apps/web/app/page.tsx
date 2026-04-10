import Link from "next/link";
import { WorkflowCard } from "@/components/workflow-card";
import { getRegistryStats, listFeaturedWorkflows, listTags } from "@/lib/registry";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stats, featuredWorkflows, tags] = await Promise.all([
    getRegistryStats(),
    listFeaturedWorkflows(),
    listTags(),
  ]);

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Phase 1 Registry</p>
          <h1>Share reusable agent workflows in public, install them locally, and version them like real artifacts.</h1>
          <p className="hero-body">
            WorkflowHub is the public registry layer for OpenClaw, Codex, and similar agent runtimes. Discover trustworthy workflows, inspect their steps, and install them into your own local environment.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/discover">
              Explore workflows
            </Link>
            <Link className="ghost-button" href="/publish">
              Publish your workflow
            </Link>
          </div>
        </div>

        <div className="hero-stat-grid">
          <div className="stat-card">
            <span>Published workflows</span>
            <strong>{stats.workflowCount.toLocaleString()}</strong>
          </div>
          <div className="stat-card">
            <span>Active authors</span>
            <strong>{stats.authorCount.toLocaleString()}</strong>
          </div>
          <div className="stat-card">
            <span>Local installs</span>
            <strong>{stats.installCount.toLocaleString()}</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Top Tags</p>
            <h2>Browse by workflow intent</h2>
          </div>
          <Link href="/discover">See all</Link>
        </div>
        <div className="tag-cloud">
          {tags.map((tag) => (
            <Link key={tag.tag} className="tag-link" href={`/discover?tag=${encodeURIComponent(tag.tag)}`}>
              {tag.tag}
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Featured</p>
            <h2>Popular reusable workflows</h2>
          </div>
          <Link href="/discover">Discover more</Link>
        </div>
        <div className="workflow-grid">
          {featuredWorkflows.map((workflow) => (
            <WorkflowCard key={workflow.slug} workflow={workflow} />
          ))}
        </div>
      </section>
    </div>
  );
}
