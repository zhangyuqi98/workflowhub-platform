import Link from "next/link";
import type { RuntimeFamily } from "@schema/types";
import { WorkflowCard } from "@/components/workflow-card";
import { listTags, listWorkflows, parseWorkflowQuery } from "@/lib/registry";

export const dynamic = "force-dynamic";

type DiscoverPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const runtimeOptions: RuntimeFamily[] = ["openclaw", "codex", "generic"];

function toSearchParams(
  params: Record<string, string | string[] | undefined> | undefined
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === "string" && value) {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}

function buildFilterHref(
  filters: { q?: string; tag?: string; runtime?: string; tool?: string },
  next: Partial<{ q?: string; tag?: string; runtime?: string; tool?: string }>
) {
  const searchParams = new URLSearchParams();
  const merged = { ...filters, ...next };

  for (const [key, value] of Object.entries(merged)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `/discover?${query}` : "/discover";
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseWorkflowQuery(toSearchParams(resolvedSearchParams));
  const [{ items, total }, tags] = await Promise.all([listWorkflows(filters), listTags()]);
  const activeFilterCount = [filters.q, filters.tag, filters.runtime, filters.tool].filter(Boolean).length;

  return (
    <div className="page-stack">
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Discover</p>
            <h1>Search, compare, and inspect workflows before you install them.</h1>
          </div>
        </div>

        <form className="discover-toolbar" action="/discover">
          <input
            className="search-field"
            type="search"
            name="q"
            placeholder="Search by task, keyword, runtime, or tool"
            defaultValue={filters.q ?? ""}
          />

          <div className="filter-row">
            <select className="filter-select" name="runtime" defaultValue={filters.runtime ?? ""}>
              <option value="">All runtimes</option>
              {runtimeOptions.map((runtime) => (
                <option key={runtime} value={runtime}>
                  {runtime}
                </option>
              ))}
            </select>

            <input
              className="filter-input"
              type="text"
              name="tool"
              placeholder="Tool, e.g. github"
              defaultValue={filters.tool ?? ""}
            />

            {filters.tag ? <input type="hidden" name="tag" value={filters.tag} /> : null}

            <button className="primary-button" type="submit">
              Search
            </button>
            <Link className="ghost-button" href="/discover">
              Clear
            </Link>
          </div>
        </form>

        <div className="discover-results-bar">
          <p className="hero-body">
            {total} workflow{total === 1 ? "" : "s"} found{activeFilterCount ? ` with ${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}` : ""}.
          </p>
          <div className="tag-cloud compact">
            {tags.map((tag) => {
              const isActive = filters.tag === tag.tag;
              return (
                <Link
                  key={tag.tag}
                  className={`tag-link ${isActive ? "is-active" : ""}`}
                  href={buildFilterHref(filters, { tag: isActive ? undefined : tag.tag })}
                >
                  {tag.tag} <span>{tag.count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {items.length ? (
        <section className="workflow-grid">
          {items.map((workflow) => (
            <WorkflowCard key={workflow.slug} workflow={workflow} />
          ))}
        </section>
      ) : (
        <section className="section-block empty-state">
          <p className="eyebrow">No Matches</p>
          <h2>No workflows matched your current filters.</h2>
          <p className="hero-body">Try clearing one of the filters, broadening your keywords, or browsing top tags instead.</p>
        </section>
      )}
    </div>
  );
}
