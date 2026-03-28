import type { AgentRole } from "@/lib/types/domain";
import { repositories } from "@/lib/persistence/repositories";
import { createEvoMapClient } from "@/lib/evomap/client";
import { env } from "@/lib/utils/env";
import { createNodeId } from "@/lib/utils/ids";
import { nowIso } from "@/lib/utils/time";

export async function ensureNodeIdentity(
  role: AgentRole,
  mode = env.EVOMAP_MODE
) {
  const existing = repositories.getAgentNode(role);

  if (existing?.evomapNodeId && existing.nodeSecret) {
    return {
      senderId: existing.evomapNodeId,
      nodeSecret: existing.nodeSecret,
      status: existing.status
    };
  }

  if (env.EVOMAP_NODE_ID && env.EVOMAP_NODE_SECRET) {
    const timestamp = nowIso();
    repositories.upsertAgentNode({
      id: existing?.id ?? createNodeId(role),
      role,
      evomapNodeId: env.EVOMAP_NODE_ID,
      nodeSecret: env.EVOMAP_NODE_SECRET,
      status: "ready",
      modelName: env.EVOMAP_MODEL_NAME,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    });

    return {
      senderId: env.EVOMAP_NODE_ID,
      nodeSecret: env.EVOMAP_NODE_SECRET,
      status: "ready"
    };
  }

  const senderId = existing?.evomapNodeId ?? createNodeId(role);
  const client = createEvoMapClient(mode);
  const hello = await client.hello({
    sender_id: senderId,
    capabilities: {
      role,
      demo: true
    },
    model: env.EVOMAP_MODEL_NAME,
    gene_count: 0,
    capsule_count: 0,
    env_fingerprint: {
      platform: process.platform,
      arch: process.arch
    },
    identity_doc:
      "HyperForge hackathon orchestrator node for EvoMap Case A demo.",
    constitution:
      "Prefer deterministic demo execution, stable asset publishing, and explicit provenance."
  });

  const timestamp = nowIso();
  repositories.upsertAgentNode({
    id: existing?.id ?? createNodeId(role),
    role,
    evomapNodeId: hello.yourNodeId,
    nodeSecret: hello.nodeSecret,
    status: hello.status,
    modelName: env.EVOMAP_MODEL_NAME,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  });

  return {
    senderId: hello.yourNodeId,
    nodeSecret: hello.nodeSecret,
    status: hello.status
  };
}
