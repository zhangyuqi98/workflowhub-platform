const docs = [
  {
    file: "workflowhub_prd.md",
    label: "WorkflowHub PRD",
    description: "Product scope, goals, and phased roadmap.",
  },
  {
    file: "workflowhub_technical_spec.md",
    label: "Technical Spec",
    description: "Architecture, services, APIs, and artifact flow.",
  },
  {
    file: "workflowhub_information_architecture.md",
    label: "Information Architecture",
    description: "Page map, navigation, and user flows.",
  },
  {
    file: "workflowhub_database_schema.md",
    label: "Database Schema",
    description: "Tables, relations, and versioning model.",
  },
];

export default function DocsPage() {
  return (
    <div className="page-stack">
      <section className="section-block">
        <p className="eyebrow">Docs</p>
        <h1>Platform planning artifacts</h1>
        <p className="hero-body">
          Phase 1 development in this repository is driven by platform-first documentation rather than the old local-only skill assumptions.
        </p>
      </section>

      <section className="two-column-grid">
        {docs.map((doc) => (
          <article key={doc.file} className="detail-card">
            <h2>{doc.label}</h2>
            <p>{doc.description}</p>
            <code>{doc.file}</code>
          </article>
        ))}
      </section>
    </div>
  );
}
