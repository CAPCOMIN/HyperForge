import type { CapsulePayload, GenePayload, PublishStatus } from "@/lib/types/domain";
import { ensureNodeIdentity } from "@/lib/evomap/auth";
import { createEvoMapClient } from "@/lib/evomap/client";
import { env } from "@/lib/utils/env";

export async function publishAssets(
  assets: Array<GenePayload | CapsulePayload>,
  mode = env.EVOMAP_MODE
) {
  const client = createEvoMapClient(mode);
  const { nodeSecret } = await ensureNodeIdentity("master", mode);
  return client.publish({ assets }, nodeSecret);
}

export function toDraftPublishStatus(mode: "mock" | "live", success: boolean): PublishStatus {
  if (!success) {
    return "failed";
  }

  return mode === "live" ? "published" : "mock-published";
}
