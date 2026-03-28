import { composeRecipeDraft } from "@/lib/genes/recipe-composer";
import type { GenePayload } from "@/lib/types/domain";

const payload = (summary: string): GenePayload => ({
  type: "Gene",
  schema_version: "1.5.0",
  category: "innovate",
  summary,
  signals_match: [],
  preconditions: [],
  strategy: [],
  constraints: {
    rules: []
  },
  validation: [],
  asset_id: `sha256:${summary}`
});

describe("composeRecipeDraft", () => {
  it("orders genes into a recipe", () => {
    const recipe = composeRecipeDraft({
      runId: "run_1",
      task: "Task",
      genes: [
        {
          id: "gene_1",
          runId: "run_1",
          sourceSubtaskId: "subtask_1",
          summary: "A",
          category: "innovate",
          signalsMatch: [],
          assetId: "sha256:a",
          publishStatus: "published",
          payload: payload("A")
        },
        {
          id: "gene_2",
          runId: "run_1",
          sourceSubtaskId: "subtask_2",
          summary: "B",
          category: "repair",
          signalsMatch: [],
          assetId: "sha256:b",
          publishStatus: "published",
          payload: {
            ...payload("B"),
            category: "repair",
            asset_id: "sha256:b"
          }
        }
      ]
    });

    expect(recipe.genes).toEqual([
      { geneAssetId: "sha256:a", position: 0 },
      { geneAssetId: "sha256:b", position: 1 }
    ]);
  });
});
