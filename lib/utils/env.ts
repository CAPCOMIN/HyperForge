import { z } from "zod";

const envSchema = z.object({
  EVOMAP_MODE: z.enum(["mock", "live"]).default("mock"),
  EVOMAP_BASE_URL: z.string().url().default("https://evomap.ai"),
  EVOMAP_AUTO_HELLO: z
    .string()
    .default("true")
    .transform((value) => value !== "false"),
  EVOMAP_NODE_ID: z.string().optional(),
  EVOMAP_NODE_SECRET: z.string().optional(),
  EVOMAP_API_KEY: z.string().optional(),
  EVOMAP_MODEL_NAME: z.string().default("gpt-5"),
  MINIMAX_BASE_URL: z.string().url().default("https://api.minimaxi.com/v1"),
  MINIMAX_MODEL_NAME: z.string().default("MiniMax-M2.5"),
  MINIMAX_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  MINIMAX_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().default("file:./data/hyperforge.db")
});

export const env = envSchema.parse({
  EVOMAP_MODE: process.env.EVOMAP_MODE,
  EVOMAP_BASE_URL: process.env.EVOMAP_BASE_URL,
  EVOMAP_AUTO_HELLO: process.env.EVOMAP_AUTO_HELLO,
  EVOMAP_NODE_ID: process.env.EVOMAP_NODE_ID,
  EVOMAP_NODE_SECRET: process.env.EVOMAP_NODE_SECRET,
  EVOMAP_API_KEY: process.env.EVOMAP_API_KEY,
  EVOMAP_MODEL_NAME: process.env.EVOMAP_MODEL_NAME,
  MINIMAX_BASE_URL: process.env.MINIMAX_BASE_URL,
  MINIMAX_MODEL_NAME: process.env.MINIMAX_MODEL_NAME,
  MINIMAX_TIMEOUT_MS: process.env.MINIMAX_TIMEOUT_MS,
  MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL
});
