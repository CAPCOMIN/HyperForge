import { z } from "zod";

export const demoRunRequestSchema = z.object({
  task: z.string().min(12),
  mode: z.enum(["mock", "live"]).default("mock"),
  agentRuntime: z.enum(["mock", "minimax"]).default("mock")
});

export const publishBundleSchema = z.object({
  assets: z.array(z.record(z.any())).min(2)
});

export const fetchRequestSchema = z.object({
  assetType: z.string().optional(),
  signals: z.array(z.string()).optional(),
  searchOnly: z.boolean().optional(),
  assetIds: z.array(z.string()).optional()
});

export const recipeCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  genes: z
    .array(
      z.object({
        geneAssetId: z.string(),
        position: z.number().int().nonnegative()
      })
    )
    .min(1),
  pricePerExecution: z.number().int().nonnegative(),
  maxConcurrent: z.number().int().positive()
});

export const recipeExpressSchema = z.object({
  recipeId: z.string().min(1),
  ttl: z.number().int().min(60).max(86400).default(3600)
});
