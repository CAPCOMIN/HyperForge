import { getRuntimeConfig } from "@/lib/config/runtime";
import { createEvoMapClient } from "@/lib/evomap/client";
import { ensureNodeIdentity } from "@/lib/evomap/auth";
import { repositories } from "@/lib/persistence/repositories";

export async function sendHeartbeat(mode = getRuntimeConfig().evomapMode) {
  const { senderId, nodeSecret } = await ensureNodeIdentity("master", mode);
  const genes = repositories.listRuns().length;
  const client = createEvoMapClient(mode);

  return client.heartbeat(
    {
      sender_id: senderId,
      gene_count: genes,
      capsule_count: genes,
      env_fingerprint: {
        platform: process.platform,
        arch: process.arch
      }
    },
    nodeSecret
  );
}
