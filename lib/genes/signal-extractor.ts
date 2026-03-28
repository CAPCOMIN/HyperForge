const stopWords = new Set(["the", "and", "for", "with", "that", "this"]);

export function extractSignals(...inputs: string[]) {
  const terms = inputs
    .join(" ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((term) => term.length > 3 && !stopWords.has(term));

  return Array.from(new Set(terms)).slice(0, 8);
}
