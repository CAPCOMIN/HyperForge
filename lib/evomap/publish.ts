import type { CapsulePayload, GenePayload, PublishStatus } from "@/lib/types/domain";
import { getRuntimeConfig } from "@/lib/config/runtime";
import { ensureNodeIdentity } from "@/lib/evomap/auth";
import { createEvoMapClient } from "@/lib/evomap/client";

export async function publishAssets(
  assets: Array<GenePayload | CapsulePayload>,
  mode = getRuntimeConfig().evomapMode
) {
  const client = createEvoMapClient(mode);
  const { senderId, nodeSecret } = await ensureNodeIdentity("master", mode);
  return client.publish({ senderId, assets }, nodeSecret);
}

export function toDraftPublishStatus(mode: "mock" | "live", success: boolean): PublishStatus {
  if (!success) {
    return "failed";
  }

  return mode === "live" ? "published" : "mock-published";
}

export function toEvoMapAssetUrl(assetId: string) {
  const baseUrl = getRuntimeConfig().evomapBaseUrl.replace(/\/$/, "");
  return `${baseUrl}/asset/${encodeURIComponent(assetId)}`;
}
