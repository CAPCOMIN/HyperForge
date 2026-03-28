import type { RunEvent } from "@/lib/types/domain";

export function TimelineView({ events }: { events: RunEvent[] }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Run Timeline</h2>
        <span className="text-sm text-steel">{events.length} events</span>
      </div>
      <div className="mt-5 space-y-4">
        {events.map((event) => (
          <article key={event.id} className="flex gap-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
            <div className="min-w-0 flex-1 rounded-2xl border border-line bg-mist p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{event.title}</h3>
                <span className="text-xs text-steel">{event.createdAt}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-steel">{event.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
