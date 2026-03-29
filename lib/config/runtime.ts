import { repositories } from "@/lib/persistence/repositories";
import { env } from "@/lib/utils/env";

export function getRuntimeConfig() {
  const settings = repositories.getAppSettings();

  return {
    evomapMode: env.EVOMAP_MODE,
    evomapBaseUrl: env.EVOMAP_BASE_URL,
    evomapAutoHello: env.EVOMAP_AUTO_HELLO,
    evomapModelName: env.EVOMAP_MODEL_NAME,
    evomapApiKey: settings.evomapApiKey ?? env.EVOMAP_API_KEY ?? null,
    evomapNodeId: settings.evomapNodeId ?? env.EVOMAP_NODE_ID ?? null,
    evomapNodeSecret: settings.evomapNodeSecret ?? env.EVOMAP_NODE_SECRET ?? null,
    minimaxBaseUrl: env.MINIMAX_BASE_URL,
    minimaxModelName: env.MINIMAX_MODEL_NAME,
    minimaxTimeoutMs: env.MINIMAX_TIMEOUT_MS,
    minimaxApiKey: settings.minimaxApiKey ?? env.MINIMAX_API_KEY ?? null
  };
}
