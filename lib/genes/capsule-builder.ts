import type { AgentExecution, AgentGeneCandidate, CapsuleDraft, CapsulePayload, GeneDraft } from "@/lib/types/domain";
import { createId } from "@/lib/utils/ids";
import { computeAssetId } from "@/lib/evomap/hashing";

export function buildCapsuleDraft(params: {
  runId: string;
  sourceSubtaskId: string;
  gene: GeneDraft;
  candidate: AgentGeneCandidate;
  execution: AgentExecution;
}): CapsuleDraft {
  const payloadWithoutAssetId: Omit<CapsulePayload, "asset_id"> = {
    type: "Capsule",
    schema_version: "1.5.0",
    trigger: params.candidate.signalsMatch,
    gene: params.gene.assetId,
    summary: `${params.execution.agentRole} execution capsule`,
    confidence: params.execution.status === "completed" ? 0.9 : 0.2,
    blast_radius: {
      files: 3,
      lines: 42
    },
    outcome: {
      status: params.execution.status === "completed" ? "success" : "failed",
      score: params.execution.status === "completed" ? 0.9 : 0.3
    },
    success_streak: params.execution.status === "completed" ? 1 : 0,
    env_fingerprint: {
      runtime: "node",
      platform: process.platform,
      arch: process.arch
    },
    content: params.candidate.content
  };

  const assetId = computeAssetId(payloadWithoutAssetId);
  const payload: CapsulePayload = {
    ...payloadWithoutAssetId,
    asset_id: assetId
  };

  return {
    id: createId("capsule"),
    runId: params.runId,
    sourceSubtaskId: params.sourceSubtaskId,
    geneAssetId: params.gene.assetId,
    summary: payload.summary,
    assetId,
    publishStatus: "local-only",
    payload
  };
}
