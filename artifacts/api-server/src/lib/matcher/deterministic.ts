import { getSkills } from "../data";
import { phraseSimilarity } from "./text";
import type { SkillMatcher } from "./types";

/** Keyword / synonym / token-overlap matcher. Needs no network access. */
export class DeterministicMatcher implements SkillMatcher {
  readonly mode = "deterministic" as const;

  async similarities(texts: string[]): Promise<number[][]> {
    const skills = getSkills();
    return texts.map((text) =>
      skills.map((skill) => {
        let best = phraseSimilarity(text, skill.name);
        for (const syn of skill.synonyms) {
          const s = phraseSimilarity(text, syn);
          if (s > best) best = s;
        }
        return best;
      }),
    );
  }
}
