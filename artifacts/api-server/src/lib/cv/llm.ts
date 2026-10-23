import { logger } from "../logger";
import { LEVELS, RANK, dedupe, levelOfQualification, setField, splitField } from "./parse";
import type { EntryKind, Line, Parsed, ParsedEducation } from "./types";

/**
 * Generic LLM adapter for CV extraction. Enabled only when LLM_PROVIDER
 * (gemini | openai | anthropic) and LLM_API_KEY are set. Optional: LLM_MODEL,
 * LLM_BASE_URL (OpenAI-compatible endpoints). The CV text is sent to the
 * provider but never stored or logged here.
 */

const TIMEOUT_MS = 25_000;
const COOLDOWN_MS = 60_000;
let lastFailure = 0;

export type Provider = "gemini" | "openai" | "anthropic";

export function llmConfig(): { provider: Provider; key: string; model: string; baseUrl?: string } | null {
  const provider = (process.env["LLM_PROVIDER"] ?? "").toLowerCase();
  const key = process.env["LLM_API_KEY"];
  if (!key || !["gemini", "openai", "anthropic"].includes(provider)) return null;
  const defaults: Record<Provider, string> = {
    gemini: "gemini-1.5-flash",
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-haiku-latest",
  };
  return {
    provider: provider as Provider,
    key,
    model: process.env["LLM_MODEL"] || defaults[provider as Provider],
    baseUrl: process.env["LLM_BASE_URL"] || undefined,
  };
}

export function llmAvailable(): boolean {
  return llmConfig() !== null && Date.now() - lastFailure > COOLDOWN_MS;
}

const SCHEMA_PROMPT = `You extract structured data from CV text. The text is in visual reading order (columns already separated).
Return ONLY one JSON object, no prose, with exactly these keys:
{
 "name": string|null, "email": string|null, "phone": string|null, "location": string|null,
 "summary": string|null,
 "education": [{"institution": string, "qualification": string, "dates": string|null, "results": string|null, "current": boolean}],
 "technicalSkills": [{"name": string, "category": string|null, "proficiency": string|null}],
 "humanSkills": [string],
 "languages": [{"name": string, "proficiency": string|null}],
 "entries": [{"title": string, "org": string|null, "role": string|null, "award": string|null, "dates": string|null, "description": string|null, "kind": "work"|"internship"|"project"|"competition"|"volunteer"}],
 "certifications": [string], "awards": [string],
 "interestTags": [string], "goalTags": [string]
}
Rules: include ONLY facts that are written in the CV. Use null (or an empty array) for anything missing. Never invent data.
Location only if an explicit address or city is given; an institution or event name is never a location.
Copy wording exactly as written, including typos. Do not invent an organisation when none is stated.
Spoken languages (English, Malay, Chinese ...) go in "languages", never in skills.`;

interface LlmJson {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
  education?: { institution?: string; qualification?: string; dates?: string | null; results?: string | null; current?: boolean }[];
  technicalSkills?: { name?: string; category?: string | null; proficiency?: string | null }[];
  humanSkills?: string[];
  languages?: { name?: string; proficiency?: string | null }[];
  entries?: { title?: string; org?: string | null; role?: string | null; award?: string | null; dates?: string | null; description?: string | null; kind?: string }[];
  certifications?: string[];
  awards?: string[];
  interestTags?: string[];
  goalTags?: string[];
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`LLM endpoint returned HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function callLlm(cvText: string): Promise<LlmJson> {
  const cfg = llmConfig();
  if (!cfg) throw new Error("LLM not configured");
  let raw = "";
  if (cfg.provider === "openai") {
    const json = (await post(
      `${cfg.baseUrl ?? "https://api.openai.com/v1"}/chat/completions`,
      { Authorization: `Bearer ${cfg.key}` },
      {
        model: cfg.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SCHEMA_PROMPT },
          { role: "user", content: cvText },
        ],
      },
    )) as { choices?: { message?: { content?: string } }[] };
    raw = json.choices?.[0]?.message?.content ?? "";
  } else if (cfg.provider === "anthropic") {
    const json = (await post(
      `${cfg.baseUrl ?? "https://api.anthropic.com"}/v1/messages`,
      { "x-api-key": cfg.key, "anthropic-version": "2023-06-01" },
      {
        model: cfg.model,
        max_tokens: 4096,
        temperature: 0,
        system: SCHEMA_PROMPT,
        messages: [{ role: "user", content: cvText }],
      },
    )) as { content?: { type: string; text?: string }[] };
    raw = json.content?.find((c) => c.type === "text")?.text ?? "";
  } else {
    const json = (await post(
      `${cfg.baseUrl ?? "https://generativelanguage.googleapis.com"}/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.key)}`,
      {},
      {
        systemInstruction: { parts: [{ text: SCHEMA_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: cvText }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      },
    )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    raw = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("LLM returned no JSON");
  return JSON.parse(raw.slice(start, end + 1)) as LlmJson;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * Merge LLM output into the parse. Every string must be present in the CV text
 * (guard against invented facts); anything else falls back to the rule result.
 */
export function mergeLlm(rules: Parsed, llm: LlmJson, lines: Line[]): Parsed {
  const source = norm(lines.map((l) => l.text).join(" "));
  const inCv = (s: string | null | undefined): s is string => typeof s === "string" && s.trim().length > 0 && source.includes(norm(s));
  const p: Parsed = JSON.parse(JSON.stringify(rules)) as Parsed;
  const from = (key: string, conf: "high" | "medium" = "high") => setField(p, key, "cv", conf, "llm");

  if (inCv(llm.name) && llm.name.split(/\s+/).length <= 5) {
    p.name = llm.name.trim();
    from("name");
  }
  if (inCv(llm.email)) {
    p.email = llm.email.trim();
    from("email");
  }
  if (inCv(llm.phone)) {
    p.phone = llm.phone.trim();
    from("phone");
  }
  if (llm.location === null || llm.location === "") {
    // the model found no explicit location; keep the stricter of the two (rules require explicit evidence)
  } else if (inCv(llm.location)) {
    p.location = llm.location.trim();
    from("location", "medium");
  }
  if (inCv(llm.summary)) {
    p.summary = llm.summary.trim();
    from("summary");
  }

  const edu: ParsedEducation[] = [];
  for (const e of llm.education ?? []) {
    if (!inCv(e.institution) && !inCv(e.qualification)) continue;
    const qualification = inCv(e.qualification) ? e.qualification.trim() : "";
    let level = levelOfQualification(qualification);
    if (!level && /matriculation|matrikulasi/i.test(e.institution ?? "")) level = LEVELS.pre;
    if (!level && /\b(smk|sekolah|school)\b/i.test(e.institution ?? "")) level = LEVELS.secondary;
    const hasDegree = (RANK[level] ?? 0) >= 3;
    const sf = hasDegree ? splitField(qualification) : { field: qualification, specialisation: "" };
    const dates = e.dates && source.includes(norm(e.dates)) ? e.dates : "";
    edu.push({
      institution: inCv(e.institution) ? e.institution.trim() : "",
      qualification,
      level,
      field: sf.field,
      specialisation: sf.specialisation,
      results: e.results && inCv(e.results) ? e.results.trim() : "",
      dates,
      current: Boolean(e.current) || /\b(now|present|current|ongoing)\b/i.test(dates),
    });
  }
  if (edu.length) {
    p.education = edu;
    from("education");
  }

  const tech = (llm.technicalSkills ?? [])
    .filter((s) => inCv(s.name))
    .map((s) => ({ name: s.name!.trim(), category: s.category?.trim() || "Technical", proficiency: s.proficiency?.trim() || "" }));
  if (tech.length) {
    p.technicalSkills = dedupe(tech, (s) => s.name);
    from("technicalSkills");
  }
  const human = (llm.humanSkills ?? []).filter(inCv).map((s) => s.trim());
  if (human.length) {
    p.humanSkills = dedupe(human, (s) => s);
    from("humanSkills");
  }
  const langs = (llm.languages ?? []).filter((l) => inCv(l.name)).map((l) => ({ name: l.name!.trim(), proficiency: l.proficiency?.trim() || "" }));
  if (langs.length) {
    p.languages = dedupe(langs, (l) => l.name);
    from("languages");
  }
  const kinds = new Set<EntryKind>(["work", "internship", "project", "competition", "volunteer"]);
  const entries = (llm.entries ?? [])
    .filter((e) => inCv(e.title))
    .map((e) => ({
      title: e.title!.trim(),
      org: e.org && inCv(e.org) ? e.org.trim() : "",
      role: e.role && inCv(e.role) ? e.role.trim() : "",
      award: e.award && inCv(e.award) ? e.award.trim() : "",
      dates: e.dates && source.includes(norm(e.dates)) ? e.dates : "",
      description: e.description ?? "",
      kind: (kinds.has(e.kind as EntryKind) ? e.kind : "project") as EntryKind,
    }));
  if (entries.length) {
    p.entries = entries;
    from("experiences");
  }
  const certs = (llm.certifications ?? []).filter(inCv).map((s) => s.trim());
  if (certs.length) p.certifications = dedupe(certs, (s) => s);
  const awards = (llm.awards ?? []).filter(inCv).map((s) => s.trim());
  if (awards.length) p.awards = dedupe(awards, (s) => s);
  if ((llm.interestTags?.length ?? 0) + (llm.goalTags?.length ?? 0) > 0) {
    p.interestTags = dedupe((llm.interestTags ?? []).map((s) => s.trim()).filter(Boolean), (s) => s).slice(0, 8);
    p.goalTags = dedupe((llm.goalTags ?? []).map((s) => s.trim()).filter(Boolean), (s) => s).slice(0, 8);
    from("interests", "medium");
  }
  const cur = p.education.find((e) => e.current && (RANK[e.level] ?? 0) >= 3);
  if (cur) {
    p.status = "student";
    setField(p, "status", "inferred", "medium", "rule:status.current-degree");
  }
  return p;
}

export function noteLlmFailure(err: unknown) {
  lastFailure = Date.now();
  logger.warn({ reason: err instanceof Error ? err.message : "LLM call failed" }, "CV LLM extraction failed, using rule-based parser");
}
