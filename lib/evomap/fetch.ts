import { getRuntimeConfig } from "@/lib/config/runtime";
import { createEvoMapClient } from "@/lib/evomap/client";
import { ensureNodeIdentity } from "@/lib/evomap/auth";

export async function fetchAssets(input: {
  assetType?: string;
  signals?: string[];
  searchOnly?: boolean;
  assetIds?: string[];
}, mode = getRuntimeConfig().evomapMode) {
  const client = createEvoMapClient(mode);
  const identity = await ensureNodeIdentity("master", mode);

  return client.fetch(
    {
      sender_id: identity.senderId,
      asset_type: input.assetType,
      signals: input.signals,
      search_only: input.searchOnly,
      asset_ids: input.assetIds
    },
    identity.nodeSecret
  );
}
