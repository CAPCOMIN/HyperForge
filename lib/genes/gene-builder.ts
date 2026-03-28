import type { AgentExecution, AgentGeneCandidate, GeneDraft, GenePayload } from "@/lib/types/domain";
import { createId } from "@/lib/utils/ids";
import { computeAssetId } from "@/lib/evomap/hashing";

function resolveModelName(execution: AgentExecution) {
  const runtimeProvider =
    typeof execution.artifacts.runtimeProvider === "string"
      ? execution.artifacts.runtimeProvider
      : null;
  const llmModelName =
    typeof execution.artifacts.llmModelName === "string"
      ? execution.artifacts.llmModelName
      : null;

  if (runtimeProvider === "minimax" && llmModelName) {
    return llmModelName;
  }

  return undefined;
}

export function buildGeneDraft(params: {
  runId: string;
  sourceSubtaskId: string;
  candidate: AgentGeneCandidate;
  execution: AgentExecution;
}): GeneDraft {
  const payloadWithoutAssetId: Omit<GenePayload, "asset_id"> = {
    type: "Gene",
    schema_version: "1.5.0",
    category: params.candidate.category,
    summary: params.candidate.summary,
    signals_match: params.candidate.signalsMatch,
    preconditions: params.candidate.preconditions,
    strategy: params.candidate.strategy,
    constraints: params.candidate.constraints,
    validation: params.candidate.validation,
    domain: "software_engineering",
    model_name: resolveModelName(params.execution)
  };

  const assetId = computeAssetId(payloadWithoutAssetId);
  const payload: GenePayload = {
    ...payloadWithoutAssetId,
    asset_id: assetId
  };

  return {
    id: createId("gene"),
    runId: params.runId,
    sourceSubtaskId: params.sourceSubtaskId,
    summary: params.candidate.summary,
    category: params.candidate.category,
    signalsMatch: params.candidate.signalsMatch,
    assetId,
    publishStatus: "local-only",
    payload
  };
}
