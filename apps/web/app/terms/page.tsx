export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <div className="page-stack">
      <section className="section-block legal-page">
        <p className="eyebrow">Terms</p>
        <h1>Terms of Use</h1>
        <p className="hero-body">
          These terms are the default operator-facing baseline for WorkflowHub deployments and should be reviewed
          before any broad public launch.
        </p>

        <div className="legal-copy">
          <section>
            <h2>Publisher responsibility</h2>
            <p>
              Publishers are responsible for the accuracy, safety, licensing status, and appropriateness of the
              workflows they upload to WorkflowHub.
            </p>
          </section>

          <section>
            <h2>Registry scope</h2>
            <p>
              WorkflowHub distributes metadata and workflow artifacts. It does not guarantee correctness, fitness for a
              particular purpose, or safe execution in downstream agent runtimes.
            </p>
          </section>

          <section>
            <h2>Operator controls</h2>
            <p>
              Operators may remove workflows, revoke publisher access, or restrict platform usage to maintain registry
              integrity, security, and policy compliance.
            </p>
          </section>

          <section>
            <h2>Beta disclaimer</h2>
            <p>
              Early WorkflowHub deployments are provided on an as-is basis. Operators should replace or extend these
              terms with project-specific legal text before a production launch.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
