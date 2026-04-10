import Link from "next/link";
import type { WorkflowListing } from "@schema/types";

type WorkflowCardProps = {
  workflow: WorkflowListing;
};

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  return (
    <article className="workflow-card">
      <div className="workflow-card-top">
        <div>
          <p className="eyebrow">{workflow.author.displayName}</p>
          <h3>{workflow.name}</h3>
        </div>
        <span className="version-pill">v{workflow.latestVersion}</span>
      </div>

      <p className="workflow-summary">{workflow.summary}</p>

      <div className="pill-row">
        {workflow.tags.map((tag) => (
          <span key={tag} className="meta-pill">
            {tag}
          </span>
        ))}
      </div>

      <div className="workflow-meta-row">
        <span>{workflow.installCount.toLocaleString()} installs</span>
        <span>{workflow.requiredTools.join(" · ")}</span>
      </div>

      <Link className="card-link" href={`/workflows/${workflow.slug}`}>
        View workflow
      </Link>
    </article>
  );
}
