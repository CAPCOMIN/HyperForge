import { computeAssetId } from "@/lib/evomap/hashing";

describe("computeAssetId", () => {
  it("is stable across key order", () => {
    const a = computeAssetId({
      type: "Gene",
      summary: "example",
      signals_match: ["a", "b"]
    });
    const b = computeAssetId({
      signals_match: ["a", "b"],
      summary: "example",
      type: "Gene"
    });

    expect(a).toBe(b);
  });

  it("ignores asset_id and model_name", () => {
    const a = computeAssetId({
      type: "Gene",
      summary: "example",
      model_name: "gpt-5",
      asset_id: "sha256:old"
    });
    const b = computeAssetId({
      type: "Gene",
      summary: "example"
    });

    expect(a).toBe(b);
  });
});
