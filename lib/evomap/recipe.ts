import type { RecipeDraft } from "@/lib/types/domain";
import { ensureNodeIdentity } from "@/lib/evomap/auth";
import { createEvoMapClient } from "@/lib/evomap/client";
import { env } from "@/lib/utils/env";

export async function createRecipeAndPublish(input: {
  title: string;
  description: string;
  genes: RecipeDraft["genes"];
  pricePerExecution: number;
  maxConcurrent: number;
}, mode = env.EVOMAP_MODE) {
  const client = createEvoMapClient(mode);
  const { senderId, nodeSecret } = await ensureNodeIdentity("master", mode);
  const created = await client.createRecipe(
    {
      senderId,
      title: input.title,
      description: input.description,
      genes: input.genes,
      pricePerExecution: input.pricePerExecution,
      maxConcurrent: input.maxConcurrent
    },
    nodeSecret
  );
  const published = await client.publishRecipe(created.recipeId, senderId, nodeSecret);

  return {
    created,
    published
  };
}

export async function expressRecipe(
  recipeId: string,
  ttl = 3600,
  mode = env.EVOMAP_MODE
) {
  const client = createEvoMapClient(mode);
  const { senderId, nodeSecret } = await ensureNodeIdentity("master", mode);
  return client.expressRecipe(recipeId, senderId, ttl, nodeSecret);
}
