import { createEvoMapClient } from "@/lib/evomap/client";
import { ensureNodeIdentity } from "@/lib/evomap/auth";
import { env } from "@/lib/utils/env";

export async function fetchAssets(input: {
  assetType?: string;
  signals?: string[];
  searchOnly?: boolean;
  assetIds?: string[];
}, mode = env.EVOMAP_MODE) {
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
