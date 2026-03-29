"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { TaskRun, UserAccount } from "@/lib/types/domain";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils/cn";

type RunFilter = "all" | TaskRun["status"];

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

export function DashboardClient({
  runs,
  users,
  selectedOwnerId,
  isAdmin
}: {
  runs: TaskRun[];
  users: UserAccount[];
  selectedOwnerId: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { t, formatDateTime, formatRelativeDuration } = useLocale();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RunFilter>("all");

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const matchesQuery =
        query.trim().length === 0 ||
        run.inputTask.toLowerCase().includes(query.toLowerCase()) ||
        run.id.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "all" || run.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, runs]);

  const stats = useMemo(
    () => ({
      total: runs.length,
      completed: runs.filter((run) => run.status === "completed").length,
      running: runs.filter((run) =>
        ["queued", "planning", "running"].includes(run.status)
      ).length,
      failed: runs.filter((run) => run.status === "failed").length
    }),
    [runs]
  );

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              {t("navDashboard")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {t("dashboardHeading")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-steel">
              {t("dashboardSubheading")}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            {t("navNewTask")}
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {[
            [t("dashboardRuns"), stats.total],
            [t("dashboardCompleted"), stats.completed],
            [t("dashboardRunning"), stats.running],
            [t("dashboardFailed"), stats.failed]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-mist p-4">
              <p className="text-sm font-medium text-steel">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("dashboardSearch")}
            className="w-full rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
          <div className={cn("grid gap-3", isAdmin ? "lg:grid-cols-2" : undefined)}>
            {isAdmin ? (
              <select
                value={selectedOwnerId ?? ""}
                onChange={(event) => {
                  const owner = event.target.value;
                  router.push(owner ? `/dashboard?owner=${owner}` : "/dashboard");
                }}
                className="rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
              >
                <option value="">全部用户</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} (@{user.username})
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as RunFilter)}
              className="rounded-2xl border border-line bg-[#f9fbfd] px-4 py-3 text-sm outline-none transition focus:border-accent"
            >
              <option value="all">{t("dashboardAll")}</option>
              <option value="queued">{t("runStatusQueued")}</option>
              <option value="planning">{t("runStatusPlanning")}</option>
              <option value="running">{t("runStatusRunning")}</option>
              <option value="completed">{t("runStatusCompleted")}</option>
              <option value="failed">{t("runStatusFailed")}</option>
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filteredRuns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-mist p-10 text-sm text-steel">
              {t("dashboardEmpty")}
            </div>
          ) : (
            filteredRuns.map((run) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className="grid gap-4 rounded-[24px] border border-line/70 bg-[#f9fbfd] p-5 transition hover:border-accent/30 hover:bg-white lg:grid-cols-[minmax(0,1fr)_240px]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]",
                        statusTone(run.status)
                      )}
                    >
                      {statusLabel(run.status, t)}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-steel">
                      {run.agentRuntime}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-steel">
                      {run.mode}
                    </span>
                    {isAdmin && run.ownerDisplayName ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-steel">
                        {run.ownerDisplayName}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-base font-semibold tracking-tight">
                    {run.inputTask}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-steel">{run.summary}</p>
                </div>
                <div className="grid gap-3 text-sm text-steel sm:grid-cols-3 lg:grid-cols-1">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-steel/70">
                      {t("dashboardRunId")}
                    </p>
                    <p className="mt-1 break-all font-medium">{run.id}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-steel/70">
                      {t("runMetaStarted")}
                    </p>
                    <p className="mt-1 font-medium">{formatDateTime(run.startedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-steel/70">
                      {t("runMetaDuration")}
                    </p>
                    <p className="mt-1 font-medium">
                      {formatRelativeDuration(run.startedAt, run.finishedAt)}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
