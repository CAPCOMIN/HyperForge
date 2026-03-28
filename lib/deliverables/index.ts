import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "fs";
import path from "path";
import type {
  AgentExecution,
  AgentRole,
  RunDeliverableBundle,
  RunDeliverableItem,
  RunDetail
} from "@/lib/types/domain";
import { env } from "@/lib/utils/env";
import { nowIso } from "@/lib/utils/time";

type DeliverableDraft = Omit<
  RunDeliverableItem,
  "byteSize" | "previewUrl" | "downloadUrl"
> & {
  content: string;
};

type DeliverableManifest = Omit<RunDeliverableBundle, "items"> & {
  items: Array<
    Omit<RunDeliverableItem, "previewUrl" | "downloadUrl"> & {
      absolutePath: string;
    }
  >;
};

function resolveDataRoot() {
  const rawDatabasePath = env.DATABASE_URL.replace(/^file:/, "");
  const absoluteDatabasePath = path.resolve(process.cwd(), rawDatabasePath);
  return path.dirname(absoluteDatabasePath);
}

function resolveRunDeliverablesDir(runId: string) {
  return path.join(resolveDataRoot(), "runs", runId, "deliverables");
}

function resolveManifestPath(runId: string) {
  return path.join(resolveRunDeliverablesDir(runId), "manifest.json");
}

function makePreviewUrl(runId: string, deliverableId: string) {
  return `/api/runs/${runId}/deliverables/${deliverableId}`;
}

function makeDownloadUrl(runId: string, deliverableId: string) {
  return `/api/runs/${runId}/deliverables/${deliverableId}?download=1`;
}

function listRoleNames(roles: AgentRole[]) {
  return Array.from(new Set(roles));
}

function getExecution(
  detail: RunDetail,
  role: Extract<AgentRole, "analyst" | "builder" | "validator">
) {
  return detail.agentExecutions.find((item) => item.agentRole === role) ?? null;
}

function asPrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function buildFinalDeliveryMarkdown(detail: RunDetail) {
  const analyst = getExecution(detail, "analyst");
  const builder = getExecution(detail, "builder");
  const validator = getExecution(detail, "validator");

  return `# Final Delivery Package

## User Goal
${detail.run.inputTask}

## Executive Summary
${detail.run.summary}

## Multi-Agent Collaboration Outcome
- Analyst: ${analyst?.summary ?? "Pending"}
- Builder: ${builder?.summary ?? "Pending"}
- Validator: ${validator?.summary ?? "Pending"}
- Genes Produced: ${detail.genes.length}
- Capsules Produced: ${detail.capsules.length}
- Recipe Status: ${detail.recipe?.status ?? "Not created"}
- Organism Status: ${detail.organism?.status ?? "Not created"}

## Analyst Output
${analyst?.detail ?? "No analyst output was generated."}

## Builder Output
${builder?.detail ?? "No builder output was generated."}

## Validator Output
${validator?.detail ?? "No validator output was generated."}

## Final Acceptance
${validator?.summary ?? detail.run.summary}

## Delivery Assets
${detail.genes.map((gene) => `- Gene: ${gene.summary} (${gene.assetId})`).join("\n") || "- No genes"}
${detail.capsules
    .map((capsule) => `- Capsule: ${capsule.summary} (${capsule.assetId})`)
    .join("\n") || "- No capsules"}
`;
}

function buildImplementationBlueprint(
  detail: RunDetail,
  builder: AgentExecution | null
) {
  const artifacts = builder?.artifacts ?? {};
  const header = `/**
 * HyperForge generated delivery blueprint
 * Run ID: ${detail.run.id}
 * Runtime: ${detail.run.agentRuntime}
 */
`;

  return `${header}
export const deliveryBlueprint = ${asPrettyJson({
    task: detail.run.inputTask,
    builderSummary: builder?.summary ?? null,
    builderDetail: builder?.detail ?? null,
    artifacts
  })} as const;
`;
}

function buildValidatorReport(detail: RunDetail, validator: AgentExecution | null) {
  return `# Validation Report

## Scope
${detail.run.inputTask}

## Outcome
${validator?.summary ?? detail.run.summary}

## Detailed Verification
${validator?.detail ?? "Validator output is not available."}
`;
}

function buildExecutionBundle(detail: RunDetail) {
  return asPrettyJson({
    run: detail.run,
    subtasks: detail.subtasks,
    agentExecutions: detail.agentExecutions,
    genes: detail.genes,
    capsules: detail.capsules,
    recipe: detail.recipe,
    organism: detail.organism
  });
}

function createDeliverableDrafts(detail: RunDetail): DeliverableDraft[] {
  const createdAt = nowIso();
  const builder = getExecution(detail, "builder");
  const validator = getExecution(detail, "validator");

  return [
    {
      id: "final-delivery",
      title: "Final Delivery Package",
      description: "Consolidated handoff written from the combined outputs of Analyst, Builder, and Validator.",
      filename: "final-delivery.md",
      kind: "document",
      previewFormat: "markdown",
      mimeType: "text/markdown; charset=utf-8",
      createdAt,
      isPrimary: true,
      sourceAgents: ["analyst", "builder", "validator"],
      content: buildFinalDeliveryMarkdown(detail)
    },
    {
      id: "implementation-blueprint",
      title: "Implementation Blueprint",
      description: "Structured code-facing blueprint distilled from the builder artifacts.",
      filename: "implementation-blueprint.ts",
      kind: "code",
      previewFormat: "code",
      mimeType: "text/plain; charset=utf-8",
      createdAt,
      isPrimary: false,
      sourceAgents: listRoleNames(["builder", "analyst"]),
      content: buildImplementationBlueprint(detail, builder)
    },
    {
      id: "validation-report",
      title: "Validation Report",
      description: "Final validation and acceptance report for the delivered outcome.",
      filename: "validation-report.md",
      kind: "document",
      previewFormat: "markdown",
      mimeType: "text/markdown; charset=utf-8",
      createdAt,
      isPrimary: false,
      sourceAgents: listRoleNames(["validator", "builder"]),
      content: buildValidatorReport(detail, validator)
    },
    {
      id: "execution-bundle",
      title: "Execution Bundle",
      description: "Raw structured execution data for download, audit, and replay.",
      filename: "execution-bundle.json",
      kind: "json",
      previewFormat: "json",
      mimeType: "application/json; charset=utf-8",
      createdAt,
      isPrimary: false,
      sourceAgents: ["analyst", "builder", "validator"],
      content: buildExecutionBundle(detail)
    }
  ];
}

export function writeRunDeliverables(detail: RunDetail) {
  const directory = resolveRunDeliverablesDir(detail.run.id);
  mkdirSync(directory, { recursive: true });

  for (const existing of readdirSync(directory)) {
    if (existing === "." || existing === "..") {
      continue;
    }

    unlinkSync(path.join(directory, existing));
  }

  const drafts = createDeliverableDrafts(detail);
  const manifestItems: DeliverableManifest["items"] = drafts.map((draft) => {
    const absolutePath = path.join(directory, draft.filename);
    writeFileSync(absolutePath, draft.content, "utf8");
    const stats = statSync(absolutePath);

    return {
      id: draft.id,
      title: draft.title,
      description: draft.description,
      filename: draft.filename,
      kind: draft.kind,
      previewFormat: draft.previewFormat,
      mimeType: draft.mimeType,
      byteSize: stats.size,
      createdAt: draft.createdAt,
      isPrimary: draft.isPrimary,
      sourceAgents: draft.sourceAgents,
      absolutePath
    };
  });

  const manifest: DeliverableManifest = {
    status: "ready",
    title: "Final Deliverables",
    description:
      "Final handoff files generated from the coordinated outputs of Analyst, Builder, and Validator.",
    outputDir: directory,
    generatedAt: nowIso(),
    primaryDeliverableId:
      manifestItems.find((item) => item.isPrimary)?.id ?? manifestItems[0]?.id ?? null,
    items: manifestItems
  };

  writeFileSync(resolveManifestPath(detail.run.id), JSON.stringify(manifest, null, 2), "utf8");
}

function toPublicBundle(
  runId: string,
  manifest: DeliverableManifest
): RunDeliverableBundle {
  return {
    status: manifest.status,
    title: manifest.title,
    description: manifest.description,
    outputDir: manifest.outputDir,
    generatedAt: manifest.generatedAt,
    primaryDeliverableId: manifest.primaryDeliverableId,
    items: manifest.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      filename: item.filename,
      kind: item.kind,
      previewFormat: item.previewFormat,
      mimeType: item.mimeType,
      byteSize: item.byteSize,
      createdAt: item.createdAt,
      isPrimary: item.isPrimary,
      sourceAgents: item.sourceAgents,
      previewUrl: makePreviewUrl(runId, item.id),
      downloadUrl: makeDownloadUrl(runId, item.id)
    }))
  };
}

export function getRunDeliverables(
  runId: string,
  runStatus?: RunDetail["run"]["status"]
): RunDeliverableBundle {
  const manifestPath = resolveManifestPath(runId);

  if (!existsSync(manifestPath)) {
    return {
      status:
        runStatus === "completed" || runStatus === "failed" ? "unavailable" : "pending",
      title: "Final Deliverables",
      description:
        "This area shows the final files assembled from all agent outputs once the run reaches a handoff-ready state.",
      outputDir: null,
      generatedAt: null,
      primaryDeliverableId: null,
      items: []
    };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as DeliverableManifest;
  return toPublicBundle(runId, manifest);
}

export function getRunDeliverableFile(runId: string, deliverableId: string) {
  const manifestPath = resolveManifestPath(runId);

  if (!existsSync(manifestPath)) {
    return null;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as DeliverableManifest;
  const item = manifest.items.find((entry) => entry.id === deliverableId);

  if (!item || !existsSync(item.absolutePath)) {
    return null;
  }

  return {
    ...item,
    content: readFileSync(item.absolutePath)
  };
}
