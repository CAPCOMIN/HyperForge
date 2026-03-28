import type { GeneDraft, RecipeDraft } from "@/lib/types/domain";
import { createId } from "@/lib/utils/ids";

export function composeRecipeDraft(params: {
  runId: string;
  task: string;
  genes: GeneDraft[];
}): RecipeDraft {
  const recipeGenes = params.genes.slice(0, 5).map((gene, index) => ({
    geneAssetId: gene.assetId,
    position: index
  }));

  return {
    id: createId("recipe"),
    runId: params.runId,
    title: "HyperForge Task Recipe",
    description: `Reusable gene sequence for task: ${params.task}`,
    genes: recipeGenes,
    pricePerExecution: 15,
    maxConcurrent: 3,
    evomapRecipeId: null,
    status: "draft"
  };
}
