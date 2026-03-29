const DEFAULT_EVOMAP_PUBLIC_BASE_URL = "https://evomap.ai";

export function toPublicEvoMapAssetUrl(assetId: string) {
  return `${DEFAULT_EVOMAP_PUBLIC_BASE_URL}/asset/${encodeURIComponent(assetId)}`;
}

