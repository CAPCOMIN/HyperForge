import { createSecret } from "@/lib/utils/ids";
import { env } from "@/lib/utils/env";
import { buildEnvelope, unwrapEvoMapResponse } from "@/lib/evomap/envelope";
import type {
  EvoMapClient,
  FetchResult,
  HelloResult,
  OrganismResult,
  PublishResult,
  RecipeCreateInput,
  RecipeResult
} from "@/lib/evomap/types";

async function postJson(
  url: string,
  body: unknown,
  auth?: string
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: `Bearer ${auth}` } : {})
    },
    body: JSON.stringify(body)
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      `EvoMap request failed (${response.status}): ${JSON.stringify(data)}`
    );
  }

  return data;
}

function createMockClient(): EvoMapClient {
  return {
    mode: "mock",
    async hello(input) {
      const senderId = String(input.sender_id ?? input.senderId ?? "node_mock");
      return {
        status: "acknowledged",
        yourNodeId: senderId,
        nodeSecret: createSecret(),
        hubNodeId: "hub_mock",
        claimUrl: "https://evomap.ai/claim/mock-demo"
      };
    },
    async heartbeat() {
      return {
        status: "alive",
        available_tasks: [],
        overdue_tasks: []
      };
    },
    async publish(input): Promise<PublishResult> {
      return {
        status: "mock-published",
        publishedAssets: input.assets.map((asset) => {
          const record = asset as Record<string, unknown>;
          return {
            assetId: String(record.asset_id),
            type: String(record.type) as "Gene" | "Capsule",
            status: "mock-published",
            gdiScore: 42
          };
        })
      };
    },
    async fetch(input): Promise<FetchResult> {
      return {
        status: "ok",
        assets: [
          {
            summary: "Mock fetched asset",
            signals: input.signals ?? [],
            type: input.asset_type ?? "Capsule"
          }
        ]
      };
    },
    async createRecipe(input: RecipeCreateInput): Promise<RecipeResult> {
      return {
        status: "draft-created",
        recipeId: `recipe_mock_${input.genes.length}`
      };
    },
    async publishRecipe(recipeId: string): Promise<RecipeResult> {
      return {
        status: "mock-published",
        recipeId
      };
    },
    async expressRecipe(
      recipeId: string,
      _senderId: string,
      ttl: number
    ): Promise<OrganismResult> {
      return {
        organism: {
          id: `organism_mock_${recipeId}`,
          recipe_id: recipeId,
          status: "assembling",
          ttl,
          genes_expressed: 0,
          genes_total_count: 3,
          born_at: new Date().toISOString()
        }
      };
    }
  };
}

function createLiveClient(): EvoMapClient {
  const baseUrl = env.EVOMAP_BASE_URL.replace(/\/$/, "");

  return {
    mode: "live",
    async hello(input): Promise<HelloResult> {
      const senderId = String(input.sender_id);
      const data = unwrapEvoMapResponse<Record<string, unknown>>(
        await postJson(
          `${baseUrl}/a2a/hello`,
          buildEnvelope({
            messageType: "hello",
            senderId,
            payload: input
          })
        )
      );

      return {
        status: String(data.status ?? "acknowledged"),
        yourNodeId: String(data.your_node_id ?? senderId),
        nodeSecret: String(data.node_secret ?? ""),
        hubNodeId: String(data.hub_node_id ?? ""),
        claimUrl: String(data.claim_url ?? "")
      };
    },
    async heartbeat(input, auth) {
      const senderId = String(input.sender_id);
      return unwrapEvoMapResponse<Record<string, unknown>>(
        await postJson(
          `${baseUrl}/a2a/heartbeat`,
          buildEnvelope({
            messageType: "heartbeat",
            senderId,
            payload: input
          }),
          auth
        )
      );
    },
    async publish(input, auth): Promise<PublishResult> {
      const firstAsset = (input.assets[0] ?? {}) as Record<string, unknown>;
      const senderId = String(firstAsset.sender_id ?? "");
      const data = unwrapEvoMapResponse<Record<string, unknown>>(
        await postJson(
          `${baseUrl}/a2a/publish`,
          buildEnvelope({
            messageType: "publish",
            senderId,
            payload: input
          }),
          auth
        )
      );

      const assets = Array.isArray(data.assets)
        ? (data.assets as Array<Record<string, unknown>>)
        : (input.assets as Array<Record<string, unknown>>);

      return {
        status: String(data.status ?? "published"),
        publishedAssets: assets.map((asset) => ({
          assetId: String(asset.asset_id),
          type: String(asset.type) as "Gene" | "Capsule",
          status: String(data.status ?? "published")
        }))
      };
    },
    async fetch(input, auth): Promise<FetchResult> {
      const senderId = String(input.sender_id ?? env.EVOMAP_NODE_ID ?? "node_fetch");
      const data = unwrapEvoMapResponse<Record<string, unknown>>(
        await postJson(
          `${baseUrl}/a2a/fetch`,
          buildEnvelope({
            messageType: "fetch",
            senderId,
            payload: input
          }),
          auth
        )
      );

      return {
        status: String(data.status ?? "ok"),
        assets: (data.assets as Array<Record<string, unknown>>) ?? []
      };
    },
    async validate(input, auth) {
      const senderId = String(input.sender_id ?? env.EVOMAP_NODE_ID ?? "node_validate");
      return unwrapEvoMapResponse<Record<string, unknown>>(
        await postJson(
          `${baseUrl}/a2a/validate`,
          buildEnvelope({
            messageType: "validate",
            senderId,
            payload: input
          }),
          auth
        )
      );
    },
    async createRecipe(input, auth): Promise<RecipeResult> {
      const data = await postJson(
        `${baseUrl}/a2a/recipe`,
        {
          sender_id: input.senderId,
          title: input.title,
          description: input.description,
          genes: input.genes.map((gene) => ({
            gene_asset_id: gene.geneAssetId,
            position: gene.position
          })),
          price_per_execution: input.pricePerExecution,
          max_concurrent: input.maxConcurrent
        },
        auth
      );

      return {
        status: String(data.status ?? "draft-created"),
        recipeId: String(data.recipe_id ?? data.id)
      };
    },
    async publishRecipe(recipeId, senderId, auth): Promise<RecipeResult> {
      const data = await postJson(
        `${baseUrl}/a2a/recipe/${recipeId}/publish`,
        { sender_id: senderId },
        auth
      );

      return {
        status: String(data.status ?? "published"),
        recipeId
      };
    },
    async expressRecipe(recipeId, senderId, ttl, auth): Promise<OrganismResult> {
      const data = await postJson(
        `${baseUrl}/a2a/recipe/${recipeId}/express`,
        { sender_id: senderId, ttl },
        auth
      );

      return {
        organism: (data.organism as OrganismResult["organism"]) ?? {
          id: String(data.id ?? ""),
          recipe_id: recipeId,
          status: "assembling",
          ttl,
          genes_expressed: 0,
          genes_total_count: 0,
          born_at: new Date().toISOString()
        }
      };
    }
  };
}

export function createEvoMapClient(mode = env.EVOMAP_MODE) {
  return mode === "live" ? createLiveClient() : createMockClient();
}
