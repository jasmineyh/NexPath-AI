import { logger } from "../logger";
import { DeterministicMatcher } from "./deterministic";
import { EmbeddingMatcher } from "./embedding";
import { MODE_LABELS, type MatchMode, type SkillMatcher } from "./types";

export { MODE_LABELS };
export type { MatchMode, SkillMatcher };

const deterministic = new DeterministicMatcher();
const COOLDOWN_MS = 30_000;

let lastFailureAt = 0;
let lastFailureReason: string | null = null;

export function embeddingConfigured(): boolean {
  return Boolean(process.env["EMBEDDING_API_URL"] && process.env["EMBEDDING_API_KEY"]);
}

export interface ScoredTexts {
  /** rows: texts, cols: skills (catalogue order). Deterministic and (optional) embedding blended by max. */
  matrix: number[][];
  mode: MatchMode;
  modeLabel: string;
  fallbackReason: string | null;
}

/**
 * Scores texts against the skill catalogue. Uses the embedding matcher when
 * configured and healthy, otherwise silently falls back to deterministic.
 * Deterministic scores are always computed so exact keyword hits are never
 * lost; the embedding score can only add semantic matches on top.
 */
export async function scoreTexts(texts: string[]): Promise<ScoredTexts> {
  const det = await deterministic.similarities(texts);

  if (!embeddingConfigured()) {
    return {
      matrix: det,
      mode: "deterministic",
      modeLabel: MODE_LABELS.deterministic,
      fallbackReason: "EMBEDDING_API_URL / EMBEDDING_API_KEY are not set",
    };
  }

  if (Date.now() - lastFailureAt < COOLDOWN_MS) {
    return {
      matrix: det,
      mode: "deterministic",
      modeLabel: MODE_LABELS.deterministic,
      fallbackReason: lastFailureReason,
    };
  }

  try {
    const matcher: SkillMatcher = new EmbeddingMatcher(
      process.env["EMBEDDING_API_URL"]!,
      process.env["EMBEDDING_API_KEY"]!,
    );
    const emb = await matcher.similarities(texts);
    lastFailureReason = null;
    const matrix = det.map((row, i) => row.map((v, j) => Math.max(v, emb[i]?.[j] ?? 0)));
    return { matrix, mode: "embedding", modeLabel: MODE_LABELS.embedding, fallbackReason: null };
  } catch (err) {
    lastFailureAt = Date.now();
    lastFailureReason = err instanceof Error ? err.message : "Embedding call failed";
    logger.warn({ err: lastFailureReason }, "Embedding matcher failed, using rule-based fallback");
    return {
      matrix: det,
      mode: "deterministic",
      modeLabel: MODE_LABELS.deterministic,
      fallbackReason: lastFailureReason,
    };
  }
}

/** Current mode without scoring anything (used by /health). Probes the endpoint when configured. */
export async function probeMode(): Promise<{
  mode: MatchMode;
  modeLabel: string;
  fallbackReason: string | null;
}> {
  const r = await scoreTexts(["health check"]);
  return { mode: r.mode, modeLabel: r.modeLabel, fallbackReason: r.fallbackReason };
}
