const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "on", "for", "to", "with", "i", "my", "me", "can", "do", "am", "is", "are",
  "that", "this", "using", "use", "used", "have", "has", "had", "make", "making", "made", "create", "creating", "created",
  "build", "built", "building", "work", "worked", "working", "also", "very", "good", "basic", "skills", "skill", "ability",
  "able", "at", "as", "by", "from", "it", "be", "been", "into", "about", "various", "some", "more", "like", "using",
]);

function stem(token: string): string {
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ies")) return token.slice(0, -3) + "y";
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#/.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(text: string): string[] {
  return normalise(text)
    .split(/[\s/.-]+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
    .map(stem);
}

/** Split free text into short phrases used as evidence units. */
export function splitClauses(text: string): string[] {
  return text
    .split(/[.;\n!?]+|,\s*(?:and\s+)?|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

/**
 * Deterministic phrase similarity in 0..1: exact match, containment on
 * token level, and token-overlap (dice) as a fallback.
 */
export function phraseSimilarity(a: string, b: string): number {
  const na = normalise(a);
  const nb = normalise(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  let overlap = 0;
  for (const t of sa) if (sb.has(t)) overlap++;
  if (overlap === 0) return 0;
  const shorter = Math.min(sa.size, sb.size);
  const containment = overlap / shorter;
  const dice = (2 * overlap) / (sa.size + sb.size);
  // Whole shorter phrase appears in the longer one: strong signal.
  if (containment === 1) return Math.max(0.8, dice);
  return Math.min(0.75, dice * 1.1);
}
