import type { GeneSequenceItem, PublishedAsset } from "@/lib/types/domain";

export interface EvoMapEnvelope<TPayload> {
  protocol: "gep-a2a";
  protocol_version: "1.0.0";
  message_type: string;
  message_id: string;
  sender_id: string;
  timestamp: string;
  payload: TPayload;
}

export interface HelloResult {
  status: string;
  yourNodeId: string;
  nodeSecret: string;
  hubNodeId?: string | null;
  claimUrl?: string | null;
}

export interface PublishResult {
  status: string;
  publishedAssets: PublishedAsset[];
}

export interface FetchResult {
  status: string;
  assets: Array<Record<string, unknown>>;
}

export interface RecipeCreateInput {
  senderId: string;
  title: string;
  description: string;
  genes: GeneSequenceItem[];
  pricePerExecution: number;
  maxConcurrent: number;
}

export interface RecipeResult {
  status: string;
  recipeId: string;
}

export interface OrganismResult {
  organism: {
    id: string;
    recipe_id: string;
    status: string;
    ttl: number;
    genes_expressed: number;
    genes_total_count: number;
    born_at: string;
  };
}

export interface EvoMapClient {
  mode: "mock" | "live";
  hello(input: Record<string, unknown>): Promise<HelloResult>;
  heartbeat(input: Record<string, unknown>, auth?: string): Promise<Record<string, unknown>>;
  publish(input: { senderId: string; assets: unknown[] }, auth: string): Promise<PublishResult>;
  fetch(input: Record<string, unknown>, auth?: string): Promise<FetchResult>;
  validate?(input: Record<string, unknown>, auth: string): Promise<Record<string, unknown>>;
  createRecipe(input: RecipeCreateInput, auth: string): Promise<RecipeResult>;
  publishRecipe(recipeId: string, senderId: string, auth: string): Promise<RecipeResult>;
  expressRecipe(
    recipeId: string,
    senderId: string,
    ttl: number,
    auth: string
  ): Promise<OrganismResult>;
}
