import type { AgentRole } from "@/lib/types/domain";
import { getRuntimeConfig } from "@/lib/config/runtime";
import { repositories } from "@/lib/persistence/repositories";
import { createEvoMapClient } from "@/lib/evomap/client";
import { createNodeId } from "@/lib/utils/ids";
import { nowIso } from "@/lib/utils/time";

export async function ensureNodeIdentity(
  role: AgentRole,
  mode = getRuntimeConfig().evomapMode
) {
  const config = getRuntimeConfig();
  const existing = repositories.getAgentNode(role);

  if (existing?.evomapNodeId && existing.nodeSecret) {
    return {
      senderId: existing.evomapNodeId,
      nodeSecret: existing.nodeSecret,
      status: existing.status
    };
  }

  if (config.evomapNodeId && config.evomapNodeSecret) {
    const timestamp = nowIso();
    repositories.upsertAgentNode({
      id: existing?.id ?? createNodeId(role),
      role,
      evomapNodeId: config.evomapNodeId,
      nodeSecret: config.evomapNodeSecret,
      status: "ready",
      modelName: config.evomapModelName,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    });

    return {
      senderId: config.evomapNodeId,
      nodeSecret: config.evomapNodeSecret,
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
    model: config.evomapModelName,
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
    modelName: config.evomapModelName,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  });

  return {
    senderId: hello.yourNodeId,
    nodeSecret: hello.nodeSecret,
    status: hello.status
  };
}
