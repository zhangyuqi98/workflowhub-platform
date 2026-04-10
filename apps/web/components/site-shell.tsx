import Link from "next/link";
import type { ReactNode } from "react";
import { getPublisherSessionState, isGitHubAuthEnabled } from "@/lib/publisher-auth";

type SiteShellProps = {
  children: ReactNode;
};

const nav = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/publish", label: "Publish" },
  { href: "/docs", label: "Docs" },
];

export async function SiteShell({ children }: SiteShellProps) {
  const publisherSession = await getPublisherSessionState();
  const dashboardHref = publisherSession.user ? `/users/${publisherSession.user.username}` : "/publish";

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark" />
          <span className="brand-copy">
            <strong>WorkflowHub</strong>
            <span>Public registry for reusable agent workflows</span>
          </span>
        </Link>

        <nav className="site-nav">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {publisherSession.authorized && publisherSession.user ? (
            <>
              <Link className="ghost-button" href={dashboardHref}>
                Dashboard
              </Link>
              <Link className="ghost-button" href="/publish">
                Publish
              </Link>
              <a className="ghost-button" href="/api/auth/logout">
                Sign out
              </a>
            </>
          ) : isGitHubAuthEnabled() ? (
            <a className="ghost-button" href="/api/auth/github/start">
              Sign in with GitHub
            </a>
          ) : (
            <Link className="ghost-button" href="/publish">
              Publish
            </Link>
          )}
          <a className="primary-button" href="https://github.com/zhangyuqi98/workflowhub" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <p>WorkflowHub is a lightweight public registry for reusable agent workflows.</p>
        <div className="site-footer-links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/docs">Docs</Link>
        </div>
      </footer>
    </div>
  );
}
