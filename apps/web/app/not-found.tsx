import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-stack">
      <section className="section-block">
        <p className="eyebrow">404</p>
        <h1>Workflow not found</h1>
        <p className="hero-body">This route is reserved for public workflow listings. Try the discover page instead.</p>
        <Link className="primary-button" href="/discover">
          Back to discover
        </Link>
      </section>
    </div>
  );
}
