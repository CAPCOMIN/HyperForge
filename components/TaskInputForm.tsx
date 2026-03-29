"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/locale-provider";
import type { UserQuotaSnapshot } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

type RuntimeStatus =
  | {
      state: "idle" | "checking";
      message: string | null;
      checkedAt?: string;
      model?: string;
    }
  | {
      state: "ready";
      message: string;
      checkedAt: string;
      model: string;
    }
  | {
      state: "error";
      message: string;
      checkedAt?: string;
      model?: string;
    };

const initialRuntimeStatus: RuntimeStatus = {
  state: "idle",
  message: null
};

export function TaskInputForm({
  className,
  autoFocus = false,
  quota,
  isAdmin = false
}: {
  className?: string;
  autoFocus?: boolean;
  quota?: UserQuotaSnapshot;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const { t, formatDateTime } = useLocale();
  const [task, setTask] = useState("");
  const [mode, setMode] = useState<"mock" | "live">("mock");
  const [agentRuntime, setAgentRuntime] = useState<"mock" | "minimax">("minimax");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitLabel, setSubmitLabel] = useState(t("composerLaunch"));
  const [runtimeStatus, setRuntimeStatus] =
    useState<RuntimeStatus>(initialRuntimeStatus);

  useEffect(() => {
    setSubmitLabel(t("composerLaunch"));
  }, [t]);

  useEffect(() => {
    if (agentRuntime !== "minimax") {
      setRuntimeStatus(initialRuntimeStatus);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const checkAvailability = async () => {
      setRuntimeStatus((current) => ({
        state: "checking",
        message:
          current.state === "ready" || current.state === "error"
            ? current.message
            : t("composerHealthChecking"),
        checkedAt: current.checkedAt,
        model: current.model
      }));

      try {
        const response = await fetch("/api/models/minimax/status", {
          cache: "no-store",
          signal: controller.signal
        });
        const payload = (await response.json()) as {
          available: boolean;
          message: string;
          checkedAt: string;
          model: string;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.available) {
          setRuntimeStatus({
            state: "error",
            message: payload.message || t("composerHealthUnavailable"),
            checkedAt: payload.checkedAt,
            model: payload.model
          });
          return;
        }

        setRuntimeStatus({
          state: "ready",
          message: payload.message,
          checkedAt: payload.checkedAt,
          model: payload.model
        });
      } catch (nextError) {
        if (cancelled || controller.signal.aborted) {
          return;
        }

        setRuntimeStatus({
          state: "error",
          message:
            nextError instanceof Error
              ? nextError.message
              : t("composerHealthUnavailable")
        });
      }
    };

    void checkAvailability();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [agentRuntime, t]);

  const minimaxBlocked =
    agentRuntime === "minimax" &&
    (runtimeStatus.state === "checking" || runtimeStatus.state === "error");
  const quotaBlocked =
    !isAdmin && quota?.limit !== null && quota ? quota.used >= quota.limit : false;

  const statusTone = useMemo(() => {
    if (agentRuntime === "mock") {
      return {
        label: t("composerRuntimeMock"),
        description: t("composerHealthMock"),
        className: "bg-slate-100 text-steel"
      };
    }

    if (runtimeStatus.state === "ready") {
      return {
        label: t("composerHealthReady"),
        description: runtimeStatus.message,
        className: "bg-success/10 text-success"
      };
    }

    if (runtimeStatus.state === "error") {
      return {
        label: t("composerHealthUnavailable"),
        description: runtimeStatus.message,
        className: "bg-warning/10 text-warning"
      };
    }

    return {
      label: t("composerHealthChecking"),
      description: t("composerHealthChecking"),
      className: "bg-mist text-steel"
    };
  }, [agentRuntime, runtimeStatus, t]);

  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/70 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl",
        className
      )}
    >
      <div className="border-b border-line/60 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-tight">
              {t("homeCanvasTitle")}
            </p>
            <p className="mt-1 text-sm text-steel">{t("homeCanvasBody")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "rounded-full px-3 py-1 font-medium",
                statusTone.className
              )}
            >
              {statusTone.label}
            </span>
            {runtimeStatus.checkedAt ? (
              <span className="text-steel/70">
                {formatDateTime(runtimeStatus.checkedAt)}
              </span>
            ) : null}
            {quota ? (
              <span className="rounded-full bg-white px-3 py-1 text-steel">
                {isAdmin
                  ? t("quotaUnlimited")
                  : `${t("quotaLabel")} ${quota.used}/${quota.limit ?? "∞"}`}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-mist p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-steel/70">
              {t("composerRuntime")}
            </p>
            <div className="mt-3 flex gap-2">
              {([
                ["mock", t("composerRuntimeMock")],
                ["minimax", t("composerRuntimeMinimax")]
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setError(null);
                    setAgentRuntime(value);
                  }}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm transition",
                    agentRuntime === value
                      ? "bg-ink text-white"
                      : "bg-white text-steel hover:text-ink"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-steel">
              {agentRuntime === "minimax"
                ? t("composerRuntimeMinimaxHint")
                : t("composerRuntimeMockHint")}
            </p>
          </div>

          <div className="rounded-2xl bg-mist p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-steel/70">
              {t("composerMode")}
            </p>
            <div className="mt-3 flex gap-2">
              {([
                ["mock", t("composerModeMock")],
                ["live", t("composerModeLive")]
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm transition",
                    mode === value
                      ? "bg-ink text-white"
                      : "bg-white text-steel hover:text-ink"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-steel">
              {statusTone.description}
            </p>
          </div>

          <div className="rounded-2xl bg-mist p-3 md:col-span-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-steel/70">
              {t("runCoordinationTitle")}
            </p>
            <p className="mt-3 text-sm leading-6 text-steel">
              {t("runCoordinationBody")}
            </p>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium">{t("composerLabel")}</span>
          <div className="mt-3 rounded-[24px] border border-line bg-[#f9fbfd] p-3 shadow-inner shadow-slate-100">
            <textarea
              autoFocus={autoFocus}
              value={task}
              onChange={(event) => setTask(event.target.value)}
              rows={8}
              placeholder={t("composerPlaceholder")}
              className="min-h-[180px] w-full border-0 bg-transparent px-2 py-2 text-[15px] leading-7 text-ink outline-none placeholder:text-steel/60"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
              <div className="text-xs text-steel/75">
                {quotaBlocked
                  ? t("quotaExceeded")
                  : agentRuntime === "minimax"
                  ? runtimeStatus.message ?? t("composerHealthChecking")
                  : t("composerHealthMock")}
              </div>
              <button
                type="button"
                disabled={isPending || minimaxBlocked || quotaBlocked}
                onClick={() => {
                  setError(null);

                  if (task.trim().length < 12) {
                    setError(t("composerShortTask"));
                    return;
                  }

                  if (quotaBlocked) {
                    setError(t("quotaExceeded"));
                    return;
                  }

                  if (agentRuntime === "minimax" && runtimeStatus.state === "error") {
                    setError(runtimeStatus.message);
                    return;
                  }

                  startTransition(async () => {
                    try {
                      setSubmitLabel(t("composerLaunching"));
                      const response = await fetch("/api/demo/run", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                          task,
                          mode,
                          agentRuntime
                        })
                      });

                      const payload = (await response.json().catch(() => null)) as
                        | { error?: string; runId?: string }
                        | null;

                      if (!response.ok) {
                        throw new Error(payload?.error ?? "Failed to start run");
                      }

                      if (!payload?.runId) {
                        throw new Error("Missing run id from server response.");
                      }

                      setSubmitLabel(t("composerOpening"));
                      router.push(`/runs/${payload.runId}`);
                      router.refresh();
                    } catch (nextError) {
                      setError(
                        nextError instanceof Error
                          ? nextError.message
                          : "Unexpected error"
                      );
                    } finally {
                      setSubmitLabel(t("composerLaunch"));
                    }
                  });
                }}
                className={cn(
                  "inline-flex min-w-[168px] items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition",
                  isPending || minimaxBlocked || quotaBlocked
                    ? "cursor-not-allowed bg-slate-300 text-slate-600"
                    : "bg-ink text-white hover:bg-slate-900"
                )}
              >
                {isPending ? submitLabel : t("composerLaunch")}
              </button>
            </div>
          </div>
        </label>

        {error ? (
          <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
