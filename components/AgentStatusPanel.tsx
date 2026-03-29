import type { AgentExecution } from "@/lib/types/domain";

export function AgentStatusPanel({
  executions
}: {
  executions: AgentExecution[];
}) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Agent Status</h2>
        <span className="text-sm text-steel">{executions.length} executions</span>
      </div>
      <div className="mt-4 space-y-3">
        {executions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-mist p-4 text-sm text-steel">
            Agents have not emitted execution output yet.
          </div>
        ) : null}
        {executions.map((execution) => (
          <article
            key={execution.id}
            className="rounded-2xl border border-line bg-mist p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                {execution.agentRole}
              </h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-steel">
                {execution.status}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-steel">{execution.summary}</p>
            {"runtimeProvider" in execution.artifacts ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-steel">
                <span className="rounded-full bg-white px-3 py-1">
                  Provider: {String(execution.artifacts.runtimeProvider)}
                </span>
                {"llmModelName" in execution.artifacts ? (
                  <span className="rounded-full bg-white px-3 py-1">
                    Model: LLM Runtime
                  </span>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
