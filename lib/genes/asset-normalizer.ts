function stripMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripMetadata);
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (key === "asset_id") {
        continue;
      }

      const normalized = stripMetadata((value as Record<string, unknown>)[key]);
      result[key] = normalized;
    }

    return result;
  }

  if (value === undefined) {
    return null;
  }

  return value;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function toCanonicalJson(value: unknown) {
  return canonicalize(stripMetadata(value));
}
