"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PublisherAccessCardProps = {
  title?: string;
  body?: string;
  mode?: "github" | "token";
};

export function PublisherAccessCard({
  title = "Publisher access required",
  body = "Enter the publisher token to unlock publishing, editing, and deletion actions.",
  mode = "token",
}: PublisherAccessCardProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/publisher-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(payload.error ?? "Failed to unlock publisher access.");
        setIsSubmitting(false);
        return;
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to unlock publisher access.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section-block access-card">
      <p className="eyebrow">Publisher Access</p>
      <h2>{title}</h2>
      <p className="hero-body">{body}</p>

      {mode === "github" ? (
        <div className="hero-actions">
          <a className="primary-button" href="/api/auth/github/start">
            Continue with GitHub
          </a>
        </div>
      ) : (
        <form className="access-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Publisher token</span>
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Enter your publisher token"
              required
            />
          </label>

          {errorMessage ? <p className="publish-error">{errorMessage}</p> : null}

          <div className="hero-actions">
            <button className="primary-button" type="submit" disabled={isSubmitting || !token.trim()}>
              {isSubmitting ? "Unlocking..." : "Unlock publisher access"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
