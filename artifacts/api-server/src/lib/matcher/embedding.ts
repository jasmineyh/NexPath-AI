import { getSkills } from "../data";
import type { SkillMatcher } from "./types";

const TIMEOUT_MS = 8000;

/**
 * Calls an external HTTP inference endpoint (e.g. a RunPod worker running
 * sentence-transformers/all-MiniLM-L6-v2).
 *
 * Request:  POST EMBEDDING_API_URL   { "texts": ["...", "..."] }
 *           Authorization: Bearer EMBEDDING_API_KEY
 * Response: { "vectors": [[0.1, ...], ...] }   (also accepts "embeddings")
 */
export class EmbeddingMatcher implements SkillMatcher {
  readonly mode = "embedding" as const;
  private skillVectors: number[][] | null = null;
  private skillVectorsKey = "";

  constructor(
    private readonly url: string,
    private readonly apiKey: string,
  ) {}

  private async embed(texts: string[]): Promise<number[][]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ texts }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Embedding endpoint returned HTTP ${res.status}`);
      const json = (await res.json()) as { vectors?: unknown; embeddings?: unknown };
      const vectors = (json.vectors ?? json.embeddings) as number[][] | undefined;
      if (
        !Array.isArray(vectors) ||
        vectors.length !== texts.length ||
        !vectors.every((v) => Array.isArray(v) && v.length > 0)
      ) {
        throw new Error("Embedding endpoint returned an unexpected response shape");
      }
      return vectors;
    } finally {
      clearTimeout(timer);
    }
  }

  private async getSkillVectors(): Promise<number[][]> {
    const skills = getSkills();
    const docs = skills.map((s) => `${s.name}: ${s.synonyms.slice(0, 4).join(", ")}`);
    const key = docs.join("|");
    if (this.skillVectors && this.skillVectorsKey === key) return this.skillVectors;
    this.skillVectors = await this.embed(docs);
    this.skillVectorsKey = key;
    return this.skillVectors;
  }

  async similarities(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const [skillVecs, textVecs] = await Promise.all([this.getSkillVectors(), this.embed(texts)]);
    return textVecs.map((tv) => skillVecs.map((sv) => Math.max(0, cosine(tv, sv))));
  }
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
