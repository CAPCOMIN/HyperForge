import type { RunDetail } from "@/lib/types/domain";

export function RunSummary({ detail }: { detail: RunDetail }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-panel">
      <h2 className="text-lg font-semibold tracking-tight">Run Summary</h2>
      <p className="mt-3 text-sm leading-7 text-steel">{detail.run.summary}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-mist p-4">
          <p className="text-sm font-medium">Subtasks</p>
          <p className="mt-1 text-2xl font-semibold">{detail.subtasks.length}</p>
        </div>
        <div className="rounded-2xl bg-mist p-4">
          <p className="text-sm font-medium">Published Genes</p>
          <p className="mt-1 text-2xl font-semibold">
            {detail.genes.filter((item) => item.publishStatus !== "local-only").length}
          </p>
        </div>
        <div className="rounded-2xl bg-mist p-4">
          <p className="text-sm font-medium">Organism Status</p>
          <p className="mt-1 text-2xl font-semibold">
            {detail.organism?.status ?? "n/a"}
          </p>
        </div>
      </div>
    </section>
  );
}
