import { createHash } from "crypto";
import { toCanonicalJson } from "@/lib/genes/asset-normalizer";

export function computeAssetId(value: unknown) {
  const hash = createHash("sha256").update(toCanonicalJson(value)).digest("hex");
  return `sha256:${hash}`;
}
