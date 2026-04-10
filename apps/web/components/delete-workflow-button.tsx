"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteWorkflowButtonProps = {
  slug: string;
  username: string;
};

export function DeleteWorkflowButton({ slug, username }: DeleteWorkflowButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(`Delete "${slug}" from WorkflowHub? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/workflows/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string; slug?: string };

      if (!response.ok) {
        window.alert(payload.error ?? "Failed to delete workflow.");
        setIsDeleting(false);
        return;
      }

      router.push(`/users/${username}?deleted=${encodeURIComponent(payload.slug ?? slug)}`);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to delete workflow.");
      setIsDeleting(false);
    }
  }

  return (
    <button className="danger-button" type="button" onClick={handleDelete} disabled={isDeleting}>
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}
