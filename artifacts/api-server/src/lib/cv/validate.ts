import { EMAIL_RE, EVENT, INST, LEVELS, RANK, dedupe, setField, normalisePhone } from "./parse";
import { isHeadingText } from "./sections";
import type { Parsed, ParsedEducation } from "./types";

const NOW = () => new Date().getFullYear();

function plausibleDates(d: string): boolean {
  const years = [...d.matchAll(/(?:19|20)\d{2}/g)].map((m) => Number(m[0]));
  if (years.length === 0) return /\b(now|present|current|ongoing)\b/i.test(d);
  if (years.some((y) => y < 1950 || y > NOW() + 8)) return false;
  if (years.length >= 2 && years[1]! < years[0]!) return false;
  return true;
}

export function primaryEducation(edu: ParsedEducation[]): ParsedEducation | null {
  if (edu.length === 0) return null;
  const degrees = edu.filter((e) => (RANK[e.level] ?? 0) >= 3);
  const current = degrees.find((e) => e.current);
  if (current) return current;
  let best: ParsedEducation | null = null;
  for (const e of edu) {
    if (!best || (RANK[e.level] ?? 0) > (RANK[best.level] ?? 0)) best = e;
  }
  return best;
}

/** Rule-based validators. Run on the output of both extraction modes. */
export function validate(p: Parsed): void {
  // email
  if (p.email && !new RegExp(`^${EMAIL_RE.source}$`).test(p.email)) {
    p.notes.push(`email "${p.email}" failed format check`);
    p.email = "";
    setField(p, "email", "check", "low", "validator:email-format");
  }
  // phone
  if (p.phone) {
    p.phone = normalisePhone(p.phone);
    const digits = p.phone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 13) {
      p.notes.push(`phone "${p.phone}" failed digit-count check`);
      p.phone = "";
      setField(p, "phone", "check", "low", "validator:phone-digits");
    }
  }
  // name
  if (p.name) {
    const bad = /\d|@/.test(p.name) || isHeadingText(p.name) || p.name.split(/\s+/).length > 5;
    if (bad) {
      p.notes.push(`name "${p.name}" failed validation`);
      p.name = "";
      setField(p, "name", "check", "low", "validator:name");
    }
  }
  // location must not be an institution, school or event
  if (p.location && (INST.test(p.location) || EVENT.test(p.location) || /^malaysia$/i.test(p.location.trim()))) {
    p.notes.push(`location "${p.location}" rejected (institution, event or bare country)`);
    p.location = "";
    setField(p, "location", "optional-missing", "low", "validator:location-not-institution");
  }
  // dates
  for (const e of p.education) {
    if (e.dates && !plausibleDates(e.dates)) {
      p.notes.push(`education dates "${e.dates}" implausible`);
      e.dates = "";
      e.current = false;
    }
  }
  for (const e of p.entries) {
    if (e.dates && !plausibleDates(e.dates)) {
      p.notes.push(`entry dates "${e.dates}" implausible`);
      e.dates = "";
    }
  }
  // skills: no duplicates, not sentences
  const okSkill = (n: string) => n.length > 0 && n.split(/\s+/).length <= 5 && !/[.!?]$/.test(n);
  p.technicalSkills = dedupe(p.technicalSkills.filter((s) => okSkill(s.name)), (s) => s.name);
  p.humanSkills = dedupe(p.humanSkills.filter(okSkill), (s) => s);
  p.languages = dedupe(p.languages.filter((l) => okSkill(l.name)), (l) => l.name);
  const langNames = new Set(p.languages.map((l) => l.name.toLowerCase()));
  p.technicalSkills = p.technicalSkills.filter((s) => !langNames.has(s.name.toLowerCase()));
  p.humanSkills = p.humanSkills.filter((s) => !langNames.has(s.toLowerCase()));

  // survey fields derived from the primary education entry
  const prim = primaryEducation(p.education);
  const eduSource = "rule:education.primary-current-or-highest";
  if (prim && prim.level) setField(p, "educationLevel", "cv", "high", eduSource);
  else setField(p, "educationLevel", "missing", "low", eduSource);
  if (prim && prim.field) setField(p, "major", "cv", "high", eduSource);
  else setField(p, "major", "missing", "low", eduSource);
  if (prim && prim.institution) setField(p, "institution", "cv", "high", eduSource);
  else setField(p, "institution", "missing", "low", eduSource);

  const keep = (key: string, ok: boolean, optional: boolean) => {
    if (ok) {
      if (!p.fields[key] || p.fields[key]!.status === "missing" || p.fields[key]!.status === "optional-missing") {
        setField(p, key, "cv", "medium", "validator:present");
      }
    } else if (!p.fields[key] || p.fields[key]!.status === "cv") {
      setField(p, key, optional ? "optional-missing" : "missing", "low", "validator:absent");
    }
  };
  keep("name", Boolean(p.name), false);
  keep("email", Boolean(p.email), false);
  keep("phone", Boolean(p.phone), false);
  keep("location", Boolean(p.location), true);
  keep("summary", Boolean(p.summary), false);
  keep("technicalSkills", p.technicalSkills.length > 0 || p.inferredSkills.length > 0, false);
  keep("humanSkills", p.humanSkills.length > 0, false);
  keep("languages", p.languages.length > 0, true);
  keep("experiences", p.entries.length > 0, true);
  keep("interests", p.interestTags.length + p.goalTags.length > 0, true);
  if (!p.status) setField(p, "status", "check", "low", "rule:status.please-confirm");
  void LEVELS;
}

export const SURVEY_KEYS = [
  "name",
  "email",
  "phone",
  "location",
  "educationLevel",
  "major",
  "institution",
  "status",
  "technicalSkills",
  "humanSkills",
  "languages",
  "selfDescription",
  "interests",
  "experiences",
];

export function computeStats(p: Parsed): { total: number; filled: number; attention: number } {
  let filled = 0;
  let attention = 0;
  for (const k of SURVEY_KEYS) {
    const f = p.fields[k === "selfDescription" ? "summary" : k];
    if (!f) {
      attention++;
      continue;
    }
    if (f.status === "cv" || f.status === "inferred") filled++;
    else if (f.status === "missing" || f.status === "check") attention++;
  }
  return { total: SURVEY_KEYS.length, filled, attention };
}
