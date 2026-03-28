"use client";

import Link from "next/link";
import type { TaskRun } from "@/lib/types/domain";
import { TaskInputForm } from "@/components/TaskInputForm";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils/cn";

function statusTone(status: TaskRun["status"]) {
  if (status === "completed") {
    return "bg-success/10 text-success";
  }

  if (status === "failed") {
    return "bg-warning/10 text-warning";
  }

  if (status === "running" || status === "planning") {
    return "bg-accent/10 text-accent";
  }

  return "bg-mist text-steel";
}

function statusLabel(
  status: TaskRun["status"],
  t: ReturnType<typeof useLocale>["t"]
) {
  if (status === "completed") {
    return t("runStatusCompleted");
  }

  if (status === "failed") {
    return t("runStatusFailed");
  }

  if (status === "running") {
    return t("runStatusRunning");
  }

  if (status === "planning") {
    return t("runStatusPlanning");
  }

  return t("runStatusQueued");
}

export function HomeWorkspace({ recentRuns }: { recentRuns: TaskRun[] }) {
  const { t, formatDateTime } = useLocale();

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            {t("appTitle")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
            {t("homeHeading")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-steel">
            {t("homeSubheading")}
          </p>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">
              {t("homeRecentRuns")}
            </h2>
            <Link href="/dashboard" className="text-xs text-accent transition hover:opacity-80">
              {t("navDashboard")}
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentRuns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-mist px-4 py-5 text-sm text-steel">
                {t("homeNoRuns")}
              </div>
            ) : (
              recentRuns.map((run) => (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="block rounded-2xl border border-line/70 bg-mist/80 px-4 py-4 transition hover:border-accent/30 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tracking-tight">
                        {run.inputTask}
                      </p>
                      <p className="mt-1 text-xs text-steel/80">
                        {formatDateTime(run.startedAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]",
                        statusTone(run.status)
                      )}
                    >
                      {statusLabel(run.status, t)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </aside>

      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: t("homeCapabilityTransfer"),
              body: t("homeCapabilityTransferBody")
            },
            {
              title: t("homeCollaboration"),
              body: t("homeCollaborationBody")
            },
            {
              title: t("homeVerification"),
              body: t("homeVerificationBody")
            }
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            >
              <h2 className="text-sm font-semibold tracking-tight">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-steel">{item.body}</p>
            </article>
          ))}
        </div>

        <TaskInputForm autoFocus className="min-h-[620px]" />
      </section>
    </div>
  );
}
