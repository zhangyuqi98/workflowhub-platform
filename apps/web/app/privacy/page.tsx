export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <div className="page-stack">
      <section className="section-block legal-page">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy Policy</h1>
        <p className="hero-body">
          WorkflowHub is a lightweight public registry for reusable workflows. This page is the baseline privacy notice
          for early beta and public testing deployments.
        </p>

        <div className="legal-copy">
          <section>
            <h2>What we store</h2>
            <p>
              Workflow metadata, publisher profile information, published JSON artifacts, install events, and audit logs
              related to publishing actions may be stored by the platform.
            </p>
          </section>

          <section>
            <h2>Authentication data</h2>
            <p>
              When GitHub sign-in is enabled, WorkflowHub stores only the minimum identity data needed to associate a
              publisher with their workflows, such as username, display name, GitHub login, and avatar URL.
            </p>
          </section>

          <section>
            <h2>Operational logs</h2>
            <p>
              The platform may record IP-derived request metadata, user agent strings, and mutation audit events for
              security, abuse prevention, and operational debugging.
            </p>
          </section>

          <section>
            <h2>Beta status</h2>
            <p>
              WorkflowHub is still an early-stage platform. Operators should adapt this policy before broad public
              launch, especially if they add analytics, third-party monitoring, or user-generated comments.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
