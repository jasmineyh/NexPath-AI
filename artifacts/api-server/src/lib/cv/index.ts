import { callLlm, llmAvailable, llmConfig, mergeLlm, noteLlmFailure } from "./llm";
import { itemsOrText, parseWithRules } from "./parse";
import { computeStats, primaryEducation, validate } from "./validate";
import type { PageInfo, Parsed, RawItem } from "./types";

export { parseWithRules } from "./parse";

export function cvMode(): { mode: "llm" | "rules"; provider: string | null; label: string } {
  const cfg = llmConfig();
  if (cfg && llmAvailable()) {
    return { mode: "llm", provider: cfg.provider, label: "Extraction mode: AI-assisted" };
  }
  return { mode: "rules", provider: null, label: "Extraction mode: Rule-based" };
}

function firstSentences(desc: string): string {
  return desc.split(/(?<=[.!?])\s+/)[0] ?? "";
}

export function toProfile(p: Parsed) {
  const prim = primaryEducation(p.education);
  const endYear = prim && !prim.current ? (prim.dates.match(/(?:19|20)\d{2}/g) ?? []).pop() ?? "" : prim?.current ? `Expected ${new Date().getFullYear()}` : "";
  const selfDescription =
    p.summary ||
    p.entries
      .map((e) => firstSentences(e.description))
      .filter(Boolean)
      .slice(0, 4)
      .join(" ")
      .slice(0, 700);
  const interests = p.interestTags.join(", ");
  const goals = p.goalTags.join("; ");
  return {
    name: p.name,
    educationLevel: prim?.level ?? "",
    major: prim?.field ?? "",
    institution: prim?.institution ?? "",
    status: p.status,
    experiences: p.entries.map((e) => ({
      title: e.title,
      org: e.org,
      description: e.description,
      kind: e.kind,
      ...(e.dates ? { dates: e.dates } : {}),
      ...(e.role ? { role: e.role } : {}),
      ...(e.award ? { award: e.award } : {}),
    })),
    technicalSkills: p.technicalSkills.map((s) => s.name),
    humanSkills: p.humanSkills,
    selfDescription,
    interests,
    goals,
    email: p.email,
    phone: p.phone,
    location: p.location,
    links: p.links,
    certifications: p.certifications,
    graduation: endYear,
    summary: p.summary,
    interestTags: [...p.interestTags, ...p.goalTags],
    education: p.education,
    skillDetails: [
      ...p.technicalSkills,
      ...p.humanSkills.map((n) => ({ name: n, category: "Soft skills", proficiency: "" })),
    ],
    languages: p.languages,
    awards: p.awards,
  };
}

export interface AnalyseOptions {
  items?: RawItem[];
  text?: string;
  pages?: PageInfo[];
  useAi?: boolean;
  debug?: boolean;
}

/** The CV content is processed in memory only: never stored and never logged. */
export async function analyseCv(opts: AnalyseOptions) {
  const items = itemsOrText({ items: opts.items, text: opts.text });
  const rules = await parseWithRules(items, opts.pages ?? []);
  let parsed = rules.parsed;
  let extractionMode: "llm" | "rules" = "rules";

  if (opts.useAi !== false && llmAvailable()) {
    try {
      const layoutText = rules.lines.map((l) => l.text).join("\n");
      const llm = await callLlm(layoutText);
      parsed = mergeLlm(rules.parsed, llm, rules.lines);
      extractionMode = "llm";
    } catch (err) {
      noteLlmFailure(err);
      parsed = rules.parsed;
    }
  }
  validate(parsed);
  const profile = toProfile(parsed);
  const stats = computeStats(parsed);
  const found = Object.entries(parsed.fields)
    .filter(([, m]) => m.status === "cv")
    .map(([k]) => k);
  const mm = rules.matchMode ?? { mode: "deterministic" as const, label: "Matching mode: Rule-based fallback" };

  return {
    profile,
    found,
    fields: parsed.fields,
    stats,
    inferredSkills: parsed.inferredSkills,
    extractionMode,
    extractionLabel: extractionMode === "llm" ? "Extraction mode: AI-assisted" : "Extraction mode: Rule-based",
    mode: mm.mode,
    modeLabel: mm.label,
    ...(opts.debug
      ? {
          debug: {
            lines: rules.lines.map((l) => ({
              text: l.text,
              x: Math.round(l.x * 10) / 10,
              y: Math.round(l.y * 10) / 10,
              page: l.page,
              size: Math.round(l.size * 10) / 10,
              col: l.col,
              section: l.section,
            })),
            sections: rules.sections,
            raw: JSON.stringify(parsed, null, 2),
            notes: parsed.notes,
          },
        }
      : {}),
  };
}
