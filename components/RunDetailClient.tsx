"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { AgentExecution, RunDetail, SubTask } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

type InspectorTab = "overview" | "plan" | "assets" | "timeline";

type ConversationMessage = {
  id: string;
  actor: "user" | "master" | "analyst" | "builder" | "validator" | "platform";
  title: string;
  content: string;
  status?: string;
  metadata?: string[];
  artifacts?: Record<string, unknown>;
  codeSnippet?: string | null;
};

function isTerminal(status: RunDetail["run"]["status"]) {
  return status === "completed" || status === "failed";
}

function statusKey(status: string): MessageKey {
  if (status === "completed") {
    return "statusCompleted";
  }

  if (status === "failed") {
    return "statusFailed";
  }

  if (status === "running" || status === "planning") {
    return "statusRunning";
  }

  return "statusPending";
}

function publishStatusTone(status: string) {
  if (status === "mock-published") {
    return "bg-success/10 text-success";
  }

  if (status === "published") {
    return "bg-accent/10 text-accent";
  }

  if (status === "failed") {
    return "bg-warning/10 text-warning";
  }

  return "bg-mist text-steel";
}

function actorTone(actor: ConversationMessage["actor"]) {
  switch (actor) {
    case "user":
      return {
        badge: "bg-ink text-white",
        panel: "border-slate-900/5 bg-slate-950 text-white",
        prose: "text-white/88",
        accent: "text-white/70"
      };
    case "master":
      return {
        badge: "bg-accent text-white",
        panel: "border-accent/20 bg-accent/5",
        prose: "text-steel",
        accent: "text-accent"
      };
    case "platform":
      return {
        badge: "bg-success text-white",
        panel: "border-success/20 bg-success/5",
        prose: "text-steel",
        accent: "text-success"
      };
    default:
      return {
        badge: "bg-white text-ink border border-line",
        panel: "border-line bg-white",
        prose: "text-steel",
        accent: "text-ink"
      };
  }
}

function actorLabel(
  actor: ConversationMessage["actor"],
  t: ReturnType<typeof useLocale>["t"]
) {
  switch (actor) {
    case "user":
      return t("actorUser");
    case "master":
      return t("actorMaster");
    case "analyst":
      return t("actorAnalyst");
    case "builder":
      return t("actorBuilder");
    case "validator":
      return t("actorValidator");
    case "platform":
      return t("actorPlatform");
  }
}

function CopyButton({
  value,
  label,
  copiedLabel,
  className
}: {
  value: string;
  label: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className={cn(
        "rounded-full border border-line/80 bg-white px-3 py-1.5 text-xs font-medium text-steel transition hover:text-ink",
        className
      )}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

function buildPlanMarkdown(
  subtasks: SubTask[],
  t: ReturnType<typeof useLocale>["t"]
) {
  return subtasks
    .map(
      (subtask, index) =>
        `### ${index + 1}. ${subtask.title}
- ${t("runAgent")}: ${subtask.assignedAgent}
- ${t("runDependsOn")}: ${
          subtask.dependsOn.length > 0
            ? subtask.dependsOn.join(", ")
            : t("runNoDependencies")
        }
- ${t("runExpectedOutput")}: ${subtask.expectedOutput}`
    )
    .join("\n\n");
}

function buildRecipeMarkdown(
  detail: RunDetail,
  t: ReturnType<typeof useLocale>["t"]
) {
  const lines = [];

  if (detail.recipe) {
    lines.push(`### ${detail.recipe.title}`);
    lines.push(detail.recipe.description);
    lines.push(
      `- ${t("runGenes")}: ${detail.recipe.genes.length}
- ${t("runStatusPanel")}: ${detail.recipe.status}`
    );
  }

  if (detail.organism) {
    lines.push(
      `### ${t("runOrganism")}
- ID: ${detail.organism.evomapOrganismId ?? detail.organism.id}
- ${t("runStatusPanel")}: ${detail.organism.status}
- ${t("runAssetProgress")}: ${detail.organism.genesExpressed}/${detail.organism.genesTotalCount}
- ${t("runAssetTtl")}: ${detail.organism.ttl}s`
    );
  }

  return lines.join("\n\n");
}

function buildConversation(
  detail: RunDetail,
  t: ReturnType<typeof useLocale>["t"]
): ConversationMessage[] {
  const messages: ConversationMessage[] = [
    {
      id: `user-${detail.run.id}`,
      actor: "user",
      title: t("runMessageUserTitle"),
      content: detail.run.inputTask,
      status: detail.run.status,
      metadata: [
        detail.run.agentRuntime,
        detail.run.mode,
        detail.run.llmModelName ?? "n/a"
      ]
    }
  ];

  if (detail.subtasks.length > 0) {
    messages.push({
      id: `master-plan-${detail.run.id}`,
      actor: "master",
      title: t("runMessageMasterTitle"),
      content: buildPlanMarkdown(detail.subtasks, t),
      metadata: [`${detail.subtasks.length} subtasks`]
    });
  }

  for (const subtask of detail.subtasks) {
    const execution = detail.agentExecutions.find(
      (item) => item.subtaskId === subtask.id
    );

    if (!execution) {
      continue;
    }

    messages.push({
      id: execution.id,
      actor: execution.agentRole,
      title: execution.summary,
      content: execution.detail,
      status: execution.status,
      metadata: execution.signals,
      artifacts: execution.artifacts,
      codeSnippet:
        typeof execution.artifacts.codeSnippet === "string"
          ? execution.artifacts.codeSnippet
          : null
    });

    const gene = detail.genes.find((item) => item.sourceSubtaskId === subtask.id);
    const capsule = detail.capsules.find(
      (item) => item.sourceSubtaskId === subtask.id
    );

    if (gene || capsule) {
      messages.push({
        id: `asset-${subtask.id}`,
        actor: "platform",
        title: t("runMessageCapabilityTitle"),
        content: [
          gene
            ? `### ${t("runAssetGene")}
- ${t("runAssetSummary")}: ${gene.summary}
- ${t("runStatusPanel")}: ${gene.publishStatus}
- ${t("runAssetId")}: ${gene.assetId}`
            : "",
          capsule
            ? `### ${t("runAssetCapsule")}
- ${t("runAssetSummary")}: ${capsule.summary}
- ${t("runStatusPanel")}: ${capsule.publishStatus}
- ${t("runAssetId")}: ${capsule.assetId}`
            : ""
        ]
          .filter(Boolean)
          .join("\n\n")
      });
    }
  }

  if (detail.recipe || detail.organism) {
    messages.push({
      id: `recipe-${detail.run.id}`,
      actor: "platform",
      title: t("runMessageRecipeTitle"),
      content: buildRecipeMarkdown(detail, t)
    });
  }

  return messages;
}

function ExecutionArtifacts({
  execution
}: {
  execution: AgentExecution;
}) {
  const { t } = useLocale();
  const artifactJson = JSON.stringify(execution.artifacts, null, 2);

  return (
    <details className="rounded-2xl border border-line/70 bg-[#f9fbfd]">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-steel">
        {t("runRawArtifacts")}
      </summary>
      <div className="border-t border-line/70 p-4">
        <MarkdownContent content={`\`\`\`json\n${artifactJson}\n\`\`\``} />
      </div>
    </details>
  );
}

function MessageCard({ message }: { message: ConversationMessage }) {
  const { t } = useLocale();
  const tone = actorTone(message.actor);

  return (
    <article className="group relative">
      <div className="flex gap-3">
        <div className="pt-1">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-semibold uppercase tracking-[0.14em]",
              tone.badge
            )}
          >
            {actorLabel(message.actor, t).slice(0, 2)}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "rounded-[26px] border px-5 py-5 shadow-[0_16px_44px_rgba(15,23,42,0.06)]",
              tone.panel
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className={cn("text-sm font-semibold tracking-tight", tone.accent)}>
                  {actorLabel(message.actor, t)}
                </div>
                <h3
                  className={cn(
                    "mt-1 text-lg font-semibold tracking-tight",
                    message.actor === "user" ? "text-white" : "text-ink"
                  )}
                >
                  {message.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {message.status ? (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]",
                      message.actor === "user"
                        ? "bg-white/10 text-white/75"
                        : statusKey(message.status) === "statusCompleted"
                          ? "bg-success/10 text-success"
                          : statusKey(message.status) === "statusFailed"
                            ? "bg-warning/10 text-warning"
                            : "bg-mist text-steel"
                    )}
                  >
                    {t(statusKey(message.status))}
                  </span>
                ) : null}
                <CopyButton
                  value={message.content}
                  label={t("runCopy")}
                  copiedLabel={t("runCopied")}
                  className={message.actor === "user" ? "border-white/15 bg-white/10 text-white/80 hover:text-white" : ""}
                />
              </div>
            </div>

            {message.metadata && message.metadata.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {message.metadata.map((item) => (
                  <span
                    key={item}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px]",
                      message.actor === "user"
                        ? "bg-white/10 text-white/75"
                        : "bg-mist text-steel"
                    )}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <div className={cn("mt-4", tone.prose)}>
              <MarkdownContent
                content={message.content}
                className={message.actor === "user" ? "text-white" : ""}
              />
            </div>

            {message.codeSnippet ? (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-steel/70">
                  {t("runCodeSnippet")}
                </p>
                <MarkdownContent
                  content={`\`\`\`ts\n${message.codeSnippet}\n\`\`\``}
                />
              </div>
            ) : null}

            {message.artifacts ? (
              <div className="mt-5">
                <ExecutionArtifacts
                  execution={{
                    id: message.id,
                    runId: "",
                    subtaskId: "",
                    agentRole:
                      message.actor === "analyst" ||
                      message.actor === "builder" ||
                      message.actor === "validator"
                        ? message.actor
                        : "analyst",
                    status:
                      message.status === "completed" ||
                      message.status === "running" ||
                      message.status === "failed" ||
                      message.status === "pending"
                        ? message.status
                        : "completed",
                    summary: message.title,
                    detail: message.content,
                    signals: [],
                    artifacts: message.artifacts,
                    createdAt: ""
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function RunDetailClient({
  initialDetail
}: {
  initialDetail: RunDetail;
}) {
  const { t, formatDateTime, formatRelativeDuration } = useLocale();
  const [detail, setDetail] = useState(initialDetail);
  const [pollError, setPollError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InspectorTab>("overview");

  useEffect(() => {
    if (isTerminal(detail.run.status)) {
      return;
    }

    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/demo/status/${detail.run.id}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Failed to refresh run status.");
        }

        const next = (await response.json()) as RunDetail;

        if (!cancelled) {
          setDetail(next);
          setPollError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setPollError(
            error instanceof Error ? error.message : "Failed to refresh run."
          );
        }
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [detail.run.id, detail.run.status]);

  const conversation = useMemo(() => buildConversation(detail, t), [detail, t]);
  const handoffs = detail.subtasks.reduce(
    (count, subtask) => count + subtask.dependsOn.length,
    0
  );
  const collaborationAssets = detail.genes.length + detail.capsules.length;
  const completedSubtasks = detail.subtasks.filter(
    (item) => item.status === "completed"
  ).length;
  const normalizedPlan = detail.timeline.some(
    (event) => event.title === "Task plan normalized"
  );
  const inspectorTabs: Array<{ id: InspectorTab; label: string }> = [
    { id: "overview", label: t("runOverview") },
    { id: "plan", label: t("runPlan") },
    { id: "assets", label: t("runAssets") },
    { id: "timeline", label: t("runTimeline") }
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="space-y-4">
        <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                {t("runStatusPanel")}
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">
                {detail.run.inputTask}
              </h1>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]",
                detail.run.status === "completed"
                  ? "bg-success/10 text-success"
                  : detail.run.status === "failed"
                    ? "bg-warning/10 text-warning"
                    : "bg-accent/10 text-accent"
              )}
            >
              {t(
                detail.run.status === "queued"
                  ? "runStatusQueued"
                  : detail.run.status === "planning"
                    ? "runStatusPlanning"
                    : detail.run.status === "running"
                      ? "runStatusRunning"
                      : detail.run.status === "completed"
                        ? "runStatusCompleted"
                        : "runStatusFailed"
              )}
            </span>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-steel">
            <div className="rounded-2xl bg-mist p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-steel/70">
                {t("runMetaRuntime")}
              </p>
              <p className="mt-2 font-medium">{detail.run.agentRuntime}</p>
            </div>
            <div className="rounded-2xl bg-mist p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-steel/70">
                {t("runMetaMode")}
              </p>
              <p className="mt-2 font-medium">{detail.run.mode}</p>
            </div>
            <div className="rounded-2xl bg-mist p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-steel/70">
                {t("runMetaModel")}
              </p>
              <p className="mt-2 font-medium">{detail.run.llmModelName ?? "n/a"}</p>
            </div>
            <div className="rounded-2xl bg-mist p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-steel/70">
                {t("runMetaDuration")}
              </p>
              <p className="mt-2 font-medium">
                {formatRelativeDuration(detail.run.startedAt, detail.run.finishedAt)}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-full border border-line bg-white px-3 py-2 text-sm transition hover:border-accent/30"
            >
              {t("runBack")}
            </Link>
            <Link
              href="/"
              className="rounded-full bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-900"
            >
              {t("navNewTask")}
            </Link>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">{t("runSubtasks")}</h2>
            <span className="text-xs text-steel/70">
              {completedSubtasks}/{detail.subtasks.length}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {detail.subtasks.map((subtask, index) => (
              <div
                key={subtask.id}
                className="rounded-2xl border border-line/70 bg-mist/80 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold tracking-tight">
                    {index + 1}. {subtask.title}
                  </p>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-steel/70">
                    {subtask.assignedAgent}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full bg-white px-2.5 py-1 text-steel">
                    {t(statusKey(subtask.status))}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-steel">
                    {subtask.dependsOn.length > 0
                      ? `${t("runDependsOn")}: ${subtask.dependsOn.join(", ")}`
                      : `${t("runDependsOn")}: ${t("runNoDependencies")}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <section className="space-y-4">
        <header className="rounded-[28px] border border-white/70 bg-white/80 px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                {t("runConversation")}
              </p>
              <p className="mt-2 text-sm leading-6 text-steel">{detail.run.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-mist px-3 py-1 text-steel">
                {t("runMetaStarted")}: {formatDateTime(detail.run.startedAt)}
              </span>
              <span className="rounded-full bg-mist px-3 py-1 text-steel">
                {t("runMetaHandoffs")}: {handoffs}
              </span>
              <span className="rounded-full bg-mist px-3 py-1 text-steel">
                {t("runMetaAssets")}: {collaborationAssets}
              </span>
            </div>
          </div>

          {normalizedPlan ? (
            <div className="mt-4 rounded-2xl border border-accent/15 bg-accent/5 px-4 py-3 text-sm text-accent">
              {t("runTaskPlanNormalized")}
            </div>
          ) : null}

          {detail.run.status === "failed" ? (
            <div className="mt-4 rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm text-warning">
              <p className="font-semibold">{t("runFailureTitle")}</p>
              <p className="mt-1">{detail.run.summary}</p>
            </div>
          ) : null}

          {pollError ? (
            <div className="mt-4 rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm text-warning">
              {pollError}
            </div>
          ) : null}
        </header>

        <div className="space-y-4">
          {conversation.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))}

          {!isTerminal(detail.run.status) ? (
            <article className="rounded-[26px] border border-dashed border-line bg-white/70 px-5 py-5 text-sm text-steel shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
              {t("runThinking")}
            </article>
          ) : null}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                {t("runInspector")}
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">
                {t("runMetaInspector")}
              </h2>
            </div>
            <div className="text-right text-xs text-steel/70">
              <div>{t("runMetaEfficiency")}</div>
              <div className="mt-1 font-semibold text-ink">
                {detail.subtasks.length > 0
                  ? `${Math.round((completedSubtasks / detail.subtasks.length) * 100)}%`
                  : "0%"}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {inspectorTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full px-3 py-2 text-sm transition",
                  activeTab === tab.id
                    ? "bg-ink text-white"
                    : "bg-mist text-steel hover:text-ink"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {activeTab === "overview" ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-mist p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-steel/70">
                      {t("runMetaStarted")}
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {formatDateTime(detail.run.startedAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-mist p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-steel/70">
                      {t("runMetaFinished")}
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {formatDateTime(detail.run.finishedAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-mist p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-steel/70">
                      {t("runMetaHandoffs")}
                    </p>
                    <p className="mt-2 text-sm font-medium">{handoffs}</p>
                  </div>
                  <div className="rounded-2xl bg-mist p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-steel/70">
                      {t("runMetaAssets")}
                    </p>
                    <p className="mt-2 text-sm font-medium">{collaborationAssets}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-line/70 bg-[#f9fbfd] p-4">
                  <h3 className="text-sm font-semibold tracking-tight">
                    {t("runCoordinationTitle")}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-steel">
                    {t("runCoordinationBody")}
                  </p>
                </div>
              </div>
            ) : null}

            {activeTab === "plan" ? (
              <div className="space-y-3">
                {detail.subtasks.map((subtask) => (
                  <article
                    key={subtask.id}
                    className="rounded-2xl border border-line/70 bg-[#f9fbfd] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold tracking-tight">
                        {subtask.title}
                      </h3>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-steel/70">
                        {subtask.assignedAgent}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-steel">
                      {subtask.description}
                    </p>
                    <p className="mt-3 text-xs text-steel/80">
                      {t("runExpectedOutput")}: {subtask.expectedOutput}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}

            {activeTab === "assets" ? (
              <div className="space-y-3">
                {detail.genes.length === 0 && detail.capsules.length === 0 && !detail.recipe ? (
                  <div className="rounded-2xl border border-dashed border-line bg-mist p-5 text-sm text-steel">
                    {t("runNoAssets")}
                  </div>
                ) : null}

                {detail.genes.map((gene) => (
                  <article
                    key={gene.id}
                    className="rounded-2xl border border-line/70 bg-[#f9fbfd] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-accent">
                          {t("runGenes")}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold tracking-tight">
                          {gene.summary}
                        </h3>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]",
                          publishStatusTone(gene.publishStatus)
                        )}
                      >
                        {gene.publishStatus}
                      </span>
                    </div>
                    <p className="mt-3 break-all text-xs text-steel/80">{gene.assetId}</p>
                  </article>
                ))}

                {detail.capsules.map((capsule) => (
                  <article
                    key={capsule.id}
                    className="rounded-2xl border border-line/70 bg-[#f9fbfd] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-accent">
                          {t("runCapsules")}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold tracking-tight">
                          {capsule.summary}
                        </h3>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]",
                          publishStatusTone(capsule.publishStatus)
                        )}
                      >
                        {capsule.publishStatus}
                      </span>
                    </div>
                    <p className="mt-3 break-all text-xs text-steel/80">
                      {capsule.assetId}
                    </p>
                  </article>
                ))}

                {detail.recipe ? (
                  <article className="rounded-2xl border border-line/70 bg-[#f9fbfd] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-accent">
                      {t("runRecipe")}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold tracking-tight">
                      {detail.recipe.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-steel">
                      {detail.recipe.description}
                    </p>
                    {detail.organism ? (
                      <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-steel">
                        <p>
                          <span className="font-medium">ID:</span>{" "}
                          {detail.organism.evomapOrganismId ?? detail.organism.id}
                        </p>
                        <p className="mt-2">
                          <span className="font-medium">{t("runStatusPanel")}:</span>{" "}
                          {detail.organism.status}
                        </p>
                      </div>
                    ) : null}
                  </article>
                ) : null}
              </div>
            ) : null}

            {activeTab === "timeline" ? (
              <div className="space-y-3">
                {detail.timeline.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line bg-mist p-5 text-sm text-steel">
                    {t("runNoTimeline")}
                  </div>
                ) : (
                  detail.timeline.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-2xl border border-line/70 bg-[#f9fbfd] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold tracking-tight">
                          {event.title}
                        </h3>
                        <span className="text-xs text-steel/70">
                          {formatDateTime(event.createdAt)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-steel">
                        {event.detail}
                      </p>
                    </article>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </section>
      </aside>
    </div>
  );
}
