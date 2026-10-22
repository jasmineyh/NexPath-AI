export type MatchMode = "embedding" | "deterministic";

/**
 * A SkillMatcher scores free-text phrases against the skill catalogue.
 * `similarities(texts)` returns one row per input text and one column per
 * skill (in catalogue order), values in 0..1.
 */
export interface SkillMatcher {
  readonly mode: MatchMode;
  similarities(texts: string[]): Promise<number[][]>;
}

export interface MatcherResolution {
  matcher: SkillMatcher;
  mode: MatchMode;
  modeLabel: string;
  fallbackReason: string | null;
}

export const MODE_LABELS: Record<MatchMode, string> = {
  embedding: "Matching mode: AI semantic (RunPod)",
  deterministic: "Matching mode: Rule-based fallback",
};
