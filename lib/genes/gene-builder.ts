import type { AgentExecution, AgentGeneCandidate, GeneDraft, GenePayload } from "@/lib/types/domain";
import { createId } from "@/lib/utils/ids";
import { computeAssetId } from "@/lib/evomap/hashing";

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
    strategy: params.candidate.strategy
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
