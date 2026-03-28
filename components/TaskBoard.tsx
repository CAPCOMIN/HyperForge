import type { SubTask } from "@/lib/types/domain";

export function TaskBoard({ subtasks }: { subtasks: SubTask[] }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Task DAG</h2>
        <span className="text-sm text-steel">{subtasks.length} subtasks</span>
      </div>
      <div className="mt-5 space-y-4">
        {subtasks.map((subtask, index) => (
          <article
            key={subtask.id}
            className="rounded-2xl border border-line bg-mist p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 text-base font-semibold">{subtask.title}</h3>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-steel">
                {subtask.assignedAgent}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-steel">{subtask.expectedOutput}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-steel">
              <span className="rounded-full bg-white px-3 py-1">
                Status: {subtask.status}
              </span>
              <span className="rounded-full bg-white px-3 py-1">
                Depends on: {subtask.dependsOn.length > 0 ? subtask.dependsOn.join(", ") : "none"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
