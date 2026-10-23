import { getSkills } from "../data";
import { scoreTexts, probeMode } from "../matcher";
import { bodySize, buildLines, collapseLetterSpacing, itemsFromText } from "./layout";
import { assignSections, isHeadingLine, isHeadingText, sectionKeys } from "./sections";
import {
  emptyParsed,
  type Col,
  type EntryKind,
  type Line,
  type PageInfo,
  type Parsed,
  type ParsedEducation,
  type ParsedEntry,
  type ParsedSkill,
  type RawItem,
  type SectionId,
} from "./types";

const MONTH =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const RANGE_SRC = `(?:${MONTH}\\.?,?\\s+)?(?:19|20)\\d{2}\\s*(?:-|–|—|to)\\s*(?:(?:${MONTH}\\.?,?\\s+)?(?:19|20)\\d{2}|present|current|now|ongoing)`;
export const DATE_RANGE = new RegExp(RANGE_SRC, "i");
const DATE_ONLY = new RegExp(`^\\(?\\s*(?:${RANGE_SRC}|(?:${MONTH}\\.?,?\\s+)?(?:19|20)\\d{2})\\s*\\)?$`, "i");
const SINGLE_DATE = new RegExp(`(?:${MONTH}\\.?,?\\s+)?(?:19|20)\\d{2}`, "i");

export const INST = /\b(universiti|university|kolej|college|sekolah|smk|sjk|school|institute|institut|politeknik|polytechnic|akademi|academy|matriculation|matrikulasi)\b/i;
export const EVENT = /\b(hackathon|hack|challenge|competition|contest|olympiad|workshop|bootcamp|conference|summit|fair|festival|crew|committee)\b/i;
const ORG_HINT =
  /\b(sdn\.?\s*bhd\.?|bhd|berhad|inc\.?|ltd\.?|llc|corp(oration)?|company|group|technolog(y|ies)|labs?|bank|startup|solutions|systems|consulting|agency|studio|centre|center|hospital|ministry|foundation|enterprise|digital)\b/i;
const BULLET = /^\s*(?:[-•*▪●◦·‣►>–—]|\d+[.)])\s+/;
const PLACES =
  "Kuala Lumpur|Petaling Jaya|Shah Alam|Subang Jaya|Cyberjaya|Putrajaya|Selangor|Penang|Pulau Pinang|George Town|Johor Bahru|Johor|Ipoh|Perak|Melaka|Malacca|Kuching|Sarawak|Kota Kinabalu|Sabah|Seremban|Negeri Sembilan|Kedah|Kelantan|Terengganu|Pahang|Perlis|Klang|Kajang|Bangi|Nilai|Labuan|Skudai|Singapore|Malaysia";
const PLACE_RE = new RegExp(`\\b(?:${PLACES})\\b`, "i");

export const LEVELS = {
  phd: "PhD",
  master: "Master's degree",
  bachelor: "Bachelor's degree",
  diploma: "Diploma",
  pre: "STPM / A-Level / Foundation",
  secondary: "SPM / O-Level",
} as const;
export const RANK: Record<string, number> = {
  [LEVELS.phd]: 6,
  [LEVELS.master]: 5,
  [LEVELS.bachelor]: 4,
  [LEVELS.diploma]: 3,
  [LEVELS.pre]: 2,
  [LEVELS.secondary]: 1,
};

export function setField(p: Parsed, key: string, status: Parsed["fields"][string]["status"], confidence: Parsed["fields"][string]["confidence"], source: string) {
  p.fields[key] = { status, confidence, source };
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w) => (w.length > 0 && /[a-z]/.test(w[0]!) ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join("");
}

export function dedupe<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const i of items) {
    const k = key(i).toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(i);
    }
  }
  return out;
}

// ---------------------------------------------------------------- prepared lines
interface PL {
  text: string;
  date: string;
  y: number;
  page: number;
  col: Col;
  size: number;
  bold: boolean;
  section: SectionId;
  bullet: boolean;
  idx: number;
}
interface PoolDate {
  date: string;
  y: number;
  page: number;
  section: SectionId;
  used: boolean;
}

function prepare(lines: Line[]): { pl: PL[]; pool: PoolDate[] } {
  const pl: PL[] = [];
  const pool: PoolDate[] = [];
  for (const l of lines) {
    if (isHeadingLine(l)) continue;
    const headerish = l.section === "header" || l.section === "contact";
    const dateCells = l.cells.filter((c) => DATE_ONLY.test(c.text));
    const other = l.cells.filter((c) => !DATE_ONLY.test(c.text));
    if (other.length === 0 || headerish) {
      if (other.length === 0 && dateCells.length) pool.push({ date: dateCells.map((c) => c.text).join(" ").replace(/[()]/g, "").trim(), y: l.y, page: l.page, section: l.section, used: false });
      continue;
    }
    let text = other.map((c) => c.text).join(" ").replace(/\s+/g, " ").trim();
    let date = dateCells[0] ? dateCells[0].text.replace(/[()]/g, "").trim() : "";
    if (!date) {
      const m = text.match(DATE_RANGE);
      if (m) {
        date = m[0].trim();
        text = text.replace(m[0], " ").replace(/\(\s*\)/g, " ").replace(/\s+/g, " ").trim();
        text = text.replace(/^[\s|,;:–—-]+|[\s|,;:–—-]+$/g, "").trim();
      }
    }
    const bullet = BULLET.test(text);
    if (bullet) text = text.replace(BULLET, "").trim();
    if (!text) continue;
    pl.push({ text, date, y: l.y, page: l.page, col: l.col, size: l.size, bold: l.bold, section: l.section, bullet, idx: l.idx });
  }
  return { pl, pool };
}

function takeDate(pool: PoolDate[], ys: { y: number; page: number; size: number }[], section: SectionId): string {
  let best: PoolDate | null = null;
  let bestD = Infinity;
  for (const d of pool) {
    if (d.used) continue;
    for (const r of ys) {
      if (d.page !== r.page) continue;
      const dist = Math.abs(d.y - r.y) - (d.section === section ? r.size * 0.4 : 0);
      if (dist <= r.size * 2.2 && dist < bestD) {
        best = d;
        bestD = dist;
      }
    }
  }
  if (best) {
    best.used = true;
    return best.date;
  }
  return "";
}

// ---------------------------------------------------------------- header
const NAME_BLOCK =
  /\b(resume|curriculum|vitae|cv|profile|summary|contact|student|graduate|undergraduate|engineer|developer|analyst|designer|intern|manager|specialist|university|universiti|college|kolej|address|email|phone|skills|education|experience|objective|about|portfolio|github|linkedin|computer|science|data|software|engineering|technology|aspiring|mobile|tel|hp)\b/i;
export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
export const PHONE_RES = [
  /(?<!\d)(?:\+?6)?0\s?1\d[\s-]*\d{3,4}[\s-]*\d{3,4}(?!\d)/,
  /(?<!\d)(?:\+?6)?0[3-9][\s-]*\d{3,4}[\s-]*\d{4}(?!\d)/,
  /(?<!\d)\+\d{1,3}[\s-]?\d[\d\s-]{7,13}\d(?!\d)/,
];
const LINK_RE = /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in|github\.com)\/[A-Za-z0-9_\-./%]+/gi;

export function normalisePhone(raw: string): string {
  return raw.replace(/\s*[-–]\s*/g, "-").replace(/\s{2,}/g, " ").trim();
}

function findPhone(texts: string[]): string {
  for (const t of texts) {
    for (const re of PHONE_RES) {
      const m = t.match(re);
      if (m) return normalisePhone(m[0]);
    }
  }
  return "";
}

function parseHeader(p: Parsed, lines: Line[]) {
  const head = lines.filter((l) => !isHeadingLine(l) && (l.section === "header" || l.section === "contact") && l.page === (lines[0]?.page ?? 1));
  const allTexts = lines.filter((l) => !isHeadingLine(l)).map((l) => l.text);
  const headTexts = head.map((l) => l.text);

  // email / phone / links
  const emailSrc = [...headTexts, ...allTexts].join("\n");
  const em = emailSrc.match(EMAIL_RE);
  if (em) {
    p.email = em[0];
    setField(p, "email", "cv", "high", "rule:email.regex");
  }
  const ph = findPhone([...headTexts, ...allTexts.filter((t) => !DATE_RANGE.test(t))]);
  if (ph) {
    p.phone = ph;
    setField(p, "phone", "cv", "high", "rule:phone.regex-my");
  }
  p.links = dedupe(
    [...allTexts.join("\n").matchAll(LINK_RE)].map((m) => m[0].replace(/[.,;)]+$/, "")),
    (x) => x,
  );
  if (p.links.length) setField(p, "links", "cv", "high", "rule:links.regex");

  // name: largest 1-4 word line at the top
  interface Cand {
    t: string;
    size: number;
    order: number;
  }
  const cands: Cand[] = [];
  head.forEach((l, li) => {
    l.cells.forEach((c, ci) => {
      const t = collapseLetterSpacing(c.text).trim();
      if (!/^[A-Za-z][A-Za-z'’.-]*(?:\s+[A-Za-z][A-Za-z'’.-]*){0,3}$/.test(t)) return;
      if (t.length > 40 || isHeadingText(t) || NAME_BLOCK.test(t)) return;
      if (/[.]$/.test(t) && t.split(/\s+/).length > 2) return;
      cands.push({ t, size: c.size || l.size, order: li * 10 + ci });
    });
  });
  if (cands.length) {
    cands.sort((a, b) => b.size - a.size || a.order - b.order);
    const top = cands[0]!;
    p.name = top.t === top.t.toUpperCase() ? titleCase(top.t) : top.t;
    setField(p, "name", "cv", "high", "rule:name.largest-top-line");
  } else if (p.email) {
    const local = p.email.split("@")[0]!.split(/[._\-\d]+/).filter(Boolean).slice(0, 3).join(" ");
    if (local) {
      p.name = titleCase(local);
      setField(p, "name", "check", "low", "rule:name.email-local-part");
    }
  }

  // location: explicit label or city/state pattern in the contact block only
  const pieces: string[] = [];
  for (const l of head) for (const c of l.cells) for (const s of c.text.split(/\s*[|•·]\s*/)) if (s.trim()) pieces.push(s.trim());
  for (const piece of pieces) {
    const lab = piece.match(/^(?:address|location|based in|city|alamat)\s*[:\-]\s*(.+)$/i);
    if (lab && lab[1]) {
      p.location = lab[1].trim();
      setField(p, "location", "cv", "high", "rule:location.label");
      break;
    }
  }
  if (!p.location) {
    for (const piece of pieces) {
      if (EMAIL_RE.test(piece) || /linkedin|github|http/i.test(piece)) continue;
      if (INST.test(piece) || EVENT.test(piece)) continue;
      if (!PLACE_RE.test(piece)) continue;
      if (piece.split(/\s+/).length > 8 || /\d{6,}/.test(piece)) continue;
      if (/^malaysia$/i.test(piece.trim())) continue;
      if (NAME_BLOCK.test(piece)) continue;
      p.location = piece.replace(/^(?:address|location)\s*[:\-]\s*/i, "").trim();
      setField(p, "location", "cv", "medium", "rule:location.contact-block-place");
      break;
    }
  }
  if (!p.location) setField(p, "location", "optional-missing", "low", "rule:location.no-explicit-evidence");

  // summary paragraph: unlabelled paragraph under the header
  const isContactish = (t: string) =>
    EMAIL_RE.test(t) ||
    /linkedin|github|http|www\./i.test(t) ||
    PHONE_RES.some((r) => r.test(t)) ||
    /^(?:address|location|email|phone|tel|contact|mobile|hp)\b/i.test(t) ||
    (p.name !== "" && t.toLowerCase() === p.name.toLowerCase());
  let start = -1;
  for (let i = 0; i < head.length; i++) {
    const t = head[i]!.text;
    if (!isContactish(t) && t.split(/\s+/).length >= 5) {
      start = i;
      break;
    }
  }
  if (start >= 0) {
    const parts = [head[start]!.text];
    for (let i = start + 1; i < head.length; i++) {
      const prev = head[i - 1]!;
      const cur = head[i]!;
      if (cur.col !== prev.col || cur.y - prev.y > 2.2 * Math.max(cur.size, prev.size)) break;
      if (isContactish(cur.text) || cur.cells.length > 1) break;
      parts.push(cur.text);
    }
    p.summary = parts.join(" ").replace(/\s+/g, " ").trim();
    setField(p, "summary", "cv", "high", "rule:summary.unlabelled-header-paragraph");
  }
}

// ---------------------------------------------------------------- education
export function levelOfQualification(q: string): string {
  if (/\b(ph\.?d|doctorate|doctor of philosophy|doktor falsafah)\b/i.test(q)) return LEVELS.phd;
  if (/\b(master|masters|msc|m\.sc|mba|m\.eng|meng|sarjana)\b/i.test(q) && !/sarjana muda/i.test(q)) return LEVELS.master;
  if (/\b(bachelor|bachelors|bsc|b\.sc|b\.eng|beng|b\.a|b\.tech|btech|sarjana muda|degree)\b/i.test(q) || /^(ba|bba)\b/i.test(q)) return LEVELS.bachelor;
  if (/\b(diploma)\b/i.test(q)) return LEVELS.diploma;
  if (/\b(stpm|a-?level|foundation|asasi|matriculation|matrikulasi|pre-?u|stam)\b/i.test(q)) return LEVELS.pre;
  if (/\b(spm|o-?level|igcse|upsr|pmr|pt3)\b/i.test(q)) return LEVELS.secondary;
  return "";
}

export function splitField(q: string): { field: string; specialisation: string } {
  let text = q.replace(/\s+/g, " ").trim();
  let specialisation = "";
  const paren = text.match(/\(([^)]+)\)/);
  if (paren && !/^hons\.?$|^honou?rs$/i.test(paren[1]!.trim())) {
    specialisation = paren[1]!.trim();
  }
  text = text.replace(/\((?:[^)]*)\)/g, " ").replace(/\s+/g, " ").trim();
  let field = text;
  const inM = text.match(/\bin\s+(.+)$/i);
  const ofM = text.match(/^(?:bachelor|master|doctor)(?:'s|s)?(?:\s+degree)?\s+of\s+(.+)$/i);
  const abbr = text.match(/^(?:b\.?sc\.?|b\.?eng\.?|b\.?a\.?|b\.?tech|bba|m\.?sc\.?|m\.?eng\.?|mba)\s*[.:-]?\s*(.+)$/i);
  const dip = text.match(/^(?:advanced\s+)?diploma\s+(?:in|of)\s+(.+)$/i);
  if (inM) field = inM[1]!.trim();
  else if (dip) field = dip[1]!.trim();
  else if (ofM) field = ofM[1]!.trim();
  else if (abbr) field = abbr[1]!.trim();
  field = field.replace(/^[\s,:-]+|[\s,:-]+$/g, "");
  return { field, specialisation };
}

function parseEducation(p: Parsed, pl: PL[], pool: PoolDate[]) {
  const lines = pl.filter((l) => l.section === "education");
  if (lines.length === 0) return;
  const isResults = (t: string) => /\b(cgpa|gpa|pngk|grade|results?)\b/i.test(t) || /^(?:\d+\s*A[+-]?\s*)+$/i.test(t);
  type Block = { lines: PL[] };
  const blocks: Block[] = [];
  const hasInst = lines.some((l) => INST.test(l.text));
  let cur: Block | null = null;
  for (const l of lines) {
    const startsNew = hasInst ? INST.test(l.text) && !isResults(l.text) : levelOfQualification(l.text) !== "" || !cur;
    if (startsNew) {
      cur = { lines: [l] };
      blocks.push(cur);
    } else if (cur) cur.lines.push(l);
    else {
      cur = { lines: [l] };
      blocks.push(cur);
    }
  }
  const entries: ParsedEducation[] = [];
  for (const b of blocks) {
    let institution = "";
    let qualification = "";
    let results = "";
    const rest: string[] = [];
    for (const l of b.lines) {
      const t = l.text;
      if (isResults(t)) {
        results = (results ? results + "; " : "") + t.replace(/^(?:results?|grade)\s*[:\-]?\s*/i, "").replace(/:\s*/, " ").trim();
        continue;
      }
      if (!institution && INST.test(t)) {
        // "Institution, Qualification" on one line
        const parts = t.split(/\s*[,|–—]\s+|\s+-\s+/);
        const instPart = parts.find((x) => INST.test(x)) ?? t;
        institution = instPart.trim();
        const other = parts.filter((x) => x !== instPart).join(", ").trim();
        if (other && levelOfQualification(other)) qualification = other;
        continue;
      }
      rest.push(t);
    }
    if (!qualification && rest.length) {
      qualification = rest[0]!;
      for (let i = 1; i < rest.length; i++) {
        if (/^[a-z(]/.test(rest[i]!) || /\($/.test(qualification)) qualification += " " + rest[i];
      }
    }
    if (!institution && !qualification) continue;
    let level = levelOfQualification(qualification);
    if (!level) {
      if (/matriculation|matrikulasi/i.test(institution)) level = LEVELS.pre;
      else if (/\b(smk|sekolah|sjk|secondary|high school|school)\b/i.test(institution)) level = LEVELS.secondary;
    }
    const { field, specialisation } = level === LEVELS.bachelor || level === LEVELS.master || level === LEVELS.phd || level === LEVELS.diploma
      ? splitField(qualification)
      : { field: qualification, specialisation: "" };
    let dates = b.lines.find((l) => l.date)?.date ?? "";
    if (!dates) dates = takeDate(pool, b.lines.slice(0, 3).map((l) => ({ y: l.y, page: l.page, size: l.size })), "education");
    entries.push({
      institution,
      qualification,
      level,
      field,
      specialisation,
      results,
      dates,
      current: /\b(now|present|current|ongoing)\b/i.test(dates),
    });
  }
  p.education = entries;
  if (entries.length) setField(p, "education", "cv", "high", "rule:education.institution-qualification-results-date");
}

// ---------------------------------------------------------------- skills
const LANG_LABELS = new Set(["language", "languages", "spokenlanguages", "languageproficiency", "languagesspoken", "languageskills"]);
const PROF_RE = /\((basic|beginner|intermediate|advanced|proficient|fluent|native|expert|familiar|conversational|elementary|good|fair)\)/i;

function splitSkillItems(text: string): { name: string; proficiency: string }[] {
  const out: { name: string; proficiency: string }[] = [];
  const safe = text.replace(/\(([^)]*)\)/g, (m) => m.replace(/,/g, "\u0001").replace(/\//g, "\u0002").replace(/&/g, "\u0003"));
  for (const part of safe.split(/[,;/&|•·●▪]/)) {
    const raw = part.replace(/\u0001/g, ",").replace(/\u0002/g, "/").replace(/\u0003/g, "&").trim();
    if (!raw) continue;
    let proficiency = "";
    let name = raw;
    const m = raw.match(PROF_RE);
    if (m) {
      proficiency = m[1]!;
      name = raw.replace(PROF_RE, "").trim();
    }
    name = name.replace(/^[-–—:.\s]+|[-–—:.\s]+$/g, "").replace(/\s{2,}/g, " ");
    if (name.length < 1 || name.length > 40) continue;
    if (name.split(/\s+/).length > 5 || /[.!?]$/.test(name)) continue;
    out.push({ name, proficiency });
  }
  return out;
}

async function parseSkills(p: Parsed, pl: PL[]) {
  const lines = pl.filter((l) => ["skills", "skills-technical", "skills-soft", "languages"].includes(l.section));
  if (lines.length === 0) return { threshold: 0.6, mode: null as null | { mode: "embedding" | "deterministic"; label: string } };

  // Group lines into labelled blocks. A new block starts at "Label: ..." or at a section change.
  interface Block {
    section: SectionId;
    label: string;
    parts: string[];
    single: boolean;
  }
  const blocks: Block[] = [];
  const anyBullet = lines.some((l) => l.bullet);
  const anyComma = lines.some((l) => /[,;]/.test(l.text));
  const lineWise = anyBullet || !anyComma;
  let cur: Block | null = null;
  for (const l of lines) {
    const lab = l.text.match(/^([A-Za-z][A-Za-z &/+.-]{1,40}?)\s*:\s*(.*)$/);
    const labelOk = lab && lab[1]!.split(/\s+/).length <= 5;
    if (labelOk) {
      cur = { section: l.section, label: lab![1]!.trim(), parts: lab![2] ? [lab![2]!.trim()] : [], single: false };
      blocks.push(cur);
      continue;
    }
    if (!cur || cur.section !== l.section || lineWise) {
      cur = { section: l.section, label: "", parts: [l.text], single: lineWise };
      blocks.push(cur);
    } else cur.parts.push(l.text);
  }

  const technical: ParsedSkill[] = [];
  const human: string[] = [];
  const generic: { name: string; proficiency: string; category: string }[] = [];
  for (const b of blocks) {
    const joined = b.parts.join(" ").replace(/\s+/g, " ").trim();
    const key = sectionKeys(b.label)[0] ?? "";
    const isLang = b.section === "languages" || LANG_LABELS.has(key);
    const items = splitSkillItems(joined);
    if (isLang) {
      for (const it of items) p.languages.push({ name: it.name, proficiency: it.proficiency });
      continue;
    }
    const cap = (s: string) => (/^[a-z]/.test(s) ? s[0]!.toUpperCase() + s.slice(1) : s);
    if (b.section === "skills-soft" || /soft|interpersonal/i.test(b.label)) {
      for (const it of items) human.push(cap(it.name));
    } else if (b.section === "skills-technical" || /technical|programming|tools|technolog|software|data|design|framework|platform|productivity/i.test(b.label)) {
      for (const it of items) technical.push({ name: it.name, category: b.label || "Technical", proficiency: it.proficiency });
    } else {
      for (const it of items) generic.push({ ...it, category: b.label || "Skills" });
    }
  }

  // Generic "Skills" blocks: classify with the SkillMatcher (technical vs professional).
  let mode: { mode: "embedding" | "deterministic"; label: string } | null = null;
  let threshold = 0.6;
  if (generic.length) {
    const catalogue = getSkills();
    const scored = await scoreTexts(generic.map((g) => g.name));
    mode = { mode: scored.mode, label: scored.modeLabel };
    threshold = scored.mode === "embedding" ? 0.5 : 0.6;
    const soft = /\b(management|leadership|teamwork|communication|collaboration|adaptab|creativ|presentation|negotiation|organi[sz]ation|critical thinking|empathy|public speaking|interpersonal|problem[- ]solving|time management)/i;
    generic.forEach((g, i) => {
      const row = scored.matrix[i] ?? [];
      let bj = -1;
      let bs = 0;
      row.forEach((v, j) => {
        if (v > bs) {
          bs = v;
          bj = j;
        }
      });
      const cat = bj >= 0 && bs >= threshold ? catalogue[bj]!.category : soft.test(g.name) ? "professional" : "technical";
      if (cat === "professional") human.push(/^[a-z]/.test(g.name) ? g.name[0]!.toUpperCase() + g.name.slice(1) : g.name);
      else technical.push({ name: g.name, category: g.category, proficiency: g.proficiency });
    });
  }

  p.technicalSkills = dedupe(technical, (s) => s.name);
  p.humanSkills = dedupe(human, (s) => s);
  p.languages = dedupe(p.languages, (s) => s.name);
  if (p.technicalSkills.length) setField(p, "technicalSkills", "cv", "high", "rule:skills.labelled-lines");
  if (p.humanSkills.length) setField(p, "humanSkills", "cv", "high", "rule:skills.soft-section");
  if (p.languages.length) setField(p, "languages", "cv", "high", "rule:languages.label");
  return { threshold, mode };
}

// ---------------------------------------------------------------- entries
const COMP_RE = /\b(hackathon|challenge|competition|contest|olympiad|championship|finalist|winner|champion|award|bronze|silver|gold|medal|prize)\b|hack\b|hack\s/i;
const VOL_RE = /\b(volunteer|volunteering|crew|committee|organi[sz]ing|head of|facilitator|usher|helper|ajk|exco)\b/i;
const AWARD_RE = /\b(finalist|award|winner|champion|place|prize|medal|gold|silver|bronze|top\s*\d+|merit|runner[- ]up|honou?rable|distinction|dean'?s list)\b/i;

function splitTitle(raw: string): { title: string; tail: string } {
  const m = raw.match(/^(.*\S)\s+[-–—]\s+(\S.*)$/);
  if (!m) return { title: raw.trim(), tail: "" };
  return { title: m[1]!.trim(), tail: m[2]!.trim() };
}

function legacyHeader(headParts: string[]): { title: string; org: string } {
  let title = "";
  let org = "";
  if (headParts.length >= 2) {
    const [a, b] = headParts as [string, string];
    if (ORG_HINT.test(a) && !ORG_HINT.test(b)) {
      org = a;
      title = b;
    } else {
      title = a;
      org = b;
    }
  } else if (headParts.length === 1) {
    const one = headParts[0]!;
    const at = one.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    const parts = one.split(/\s+[|–—-]\s+|\s*\|\s*/).map((x) => x.trim()).filter(Boolean);
    if (at) {
      title = at[1]!;
      org = at[2]!;
    } else if (parts.length >= 2) {
      if (ORG_HINT.test(parts[0]!) && !ORG_HINT.test(parts[1]!)) {
        org = parts[0]!;
        title = parts[1]!;
      } else {
        title = parts[0]!;
        org = parts.slice(1).join(", ");
      }
    } else title = one;
  }
  return { title, org };
}

function sentence(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function parseEntries(p: Parsed, pl: PL[], pool: PoolDate[], bodySz: number) {
  const sections: SectionId[] = ["experience", "projects", "volunteer"];
  for (const sec of sections) {
    const lines = pl.filter((l) => l.section === sec);
    if (lines.length === 0) continue;
    const emph = (l: PL) => !l.bullet && (l.bold || l.size >= bodySz * 1.06);
    const emphasisMode = lines.some(emph) && !lines.every(emph);

    interface Raw {
      head: PL[];
      bullets: string[];
      paras: string[];
    }
    const raws: Raw[] = [];
    let cur: Raw | null = null;
    for (const l of lines) {
      if (l.bullet) {
        if (!cur) {
          cur = { head: [], bullets: [], paras: [] };
          raws.push(cur);
        }
        cur.bullets.push(l.text);
        continue;
      }
      let startsNew: boolean;
      let asHeadExtra = false;
      if (!cur) startsNew = true;
      else if (emphasisMode) {
        const prevHead = cur.head[cur.head.length - 1];
        const hasBody = cur.paras.length > 0 || cur.bullets.length > 0;
        if (emph(l)) {
          // continuation of a wrapped title line
          const dashTail = prevHead ? prevHead.text.match(/\s[-–—]\s+(.+)$/)?.[1] : undefined;
          const wraps =
            prevHead &&
            !hasBody &&
            !prevHead.date &&
            (/^[a-z(]/.test(l.text) ||
              /(?:\s[-–—]|\b(?:of|and|&|the|for|in))$/i.test(prevHead.text) ||
              (dashTail !== undefined && dashTail.split(/\s+/).length <= 2 && l.text.split(/\s+/).length <= 3));
          startsNew = !wraps;
          if (wraps && prevHead) {
            prevHead.text += " " + l.text;
            continue;
          }
        } else if (!hasBody && cur.head.length < 3 && (l.date || (sec === "experience" && ORG_HINT.test(l.text))) && l.text.length < 90) {
          startsNew = false;
          asHeadExtra = true;
        } else startsNew = false;
      } else {
        const hasBody = cur.paras.length > 0 || cur.bullets.length > 0;
        const short = l.text.length < 100;
        if (hasBody && cur.bullets.length > 0 && /^[a-z]/.test(l.text)) {
          cur.bullets[cur.bullets.length - 1] += " " + l.text;
          continue;
        }
        startsNew = (hasBody && short) || (Boolean(l.date) && cur.head.some((h) => h.date));
        if (!startsNew && !hasBody && cur.head.length < 3 && short) asHeadExtra = true;
      }
      if (startsNew) {
        cur = { head: [l], bullets: [], paras: [] };
        raws.push(cur);
      } else if (cur) {
        if (asHeadExtra) cur.head.push(l);
        else cur.paras.push(l.text);
      }
    }

    for (const r of raws) {
      if (r.head.length === 0 && r.bullets.length === 0) continue;
      let dates = r.head.find((h) => h.date)?.date ?? "";
      if (!dates) dates = takeDate(pool, r.head.slice(0, 2).map((h) => ({ y: h.y, page: h.page, size: h.size })), sec);
      const headTexts = r.head.map((h) => h.text.replace(/^[\s|,;:–—-]+|[\s|,;:–—-]+$/g, "")).filter(Boolean);
      let title = "";
      let org = "";
      let role = "";
      let award = "";
      const descBits: string[] = [];
      if (sec === "experience") {
        const h = legacyHeader(headTexts);
        title = h.title;
        org = h.org;
      } else {
        const { title: t, tail } = splitTitle(headTexts[0] ?? "");
        title = t;
        if (tail) {
          if (AWARD_RE.test(tail)) award = tail;
          else role = tail;
        }
        for (const extra of headTexts.slice(1)) descBits.push(extra);
      }
      const description = [...descBits, ...r.paras].join(" ").replace(/\s+/g, " ").trim();
      const bulletText = r.bullets.map(sentence).join(" ");
      const fullDesc = [description, bulletText].filter(Boolean).join(" ").trim();
      if (!title && !fullDesc) continue;

      const probe = `${title} ${role} ${award}`;
      let kind: EntryKind;
      if (VOL_RE.test(role) || VOL_RE.test(title)) kind = "volunteer";
      else if (sec === "volunteer") kind = "volunteer";
      else if (COMP_RE.test(probe) || award) kind = "competition";
      else if (sec === "projects") kind = "project";
      else kind = /intern|attachment|practicum|trainee/i.test(`${title} ${org}`) ? "internship" : "work";
      if (sec === "experience" && kind === "competition" && org) kind = "work";

      p.entries.push({
        title: title || (sec === "projects" ? "Project" : "Role"),
        org,
        role,
        award,
        dates,
        description: fullDesc,
        kind,
      });
    }
  }
  if (p.entries.length) setField(p, "experiences", "cv", "high", "rule:entries.heading-based");
}

// ---------------------------------------------------------------- misc sections
function parseList(pl: PL[], sec: SectionId): string[] {
  const out: string[] = [];
  for (const l of pl.filter((x) => x.section === sec)) {
    const t = l.date ? `${l.text} ${l.date}`.trim() : l.text;
    if (!l.bullet && out.length && /^[a-z(]/.test(t)) out[out.length - 1] += " " + t;
    else out.push(t);
  }
  return dedupe(out.map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length >= 3 && s.length <= 200), (s) => s).slice(0, 15);
}

const GOAL_VERB =
  "design|build|create|develop|improve|solve|optimi[sz]e|automate|secure|protect|analy[sz]e|deliver|support|make|help|drive|enhance|streamline|apply|leverage|use|contribute|grow|learn|work|pursue|become";
const ROLE_RE =
  /\b((?:data|software|cyber ?security|machine learning|ai|cloud|web|mobile|ux|ui|product|business|systems?|network|devops|backend|frontend|full[- ]?stack|security|database|information|it)\s+(?:specialist|analyst|engineer|scientist|developer|designer|architect|consultant|administrator|manager|researcher|professional))\b/gi;

function extractTags(summary: string): { interests: string[]; goals: string[] } {
  const interests = dedupe(
    [...summary.matchAll(ROLE_RE)].map((m) => m[1]!.toLowerCase().replace(/\s+/g, " ")),
    (x) => x,
  );
  const goals: string[] = [];
  const cue = new RegExp(`\\b(?:to|aims? to|wants? to|hopes? to|eager to|motivated to|passionate about|seeking to|looking to)\\s+((?:${GOAL_VERB})\\b[^.;]*)`, "gi");
  for (const m of summary.matchAll(cue)) {
    const clause = m[1]!.replace(/[,]\s*$/g, "").trim();
    const parts = clause.split(new RegExp(`\\s*,\\s*|\\s+and\\s+(?=(?:${GOAL_VERB})\\b)`, "i")).map((x) => x.trim()).filter((x) => x.length > 3);
    goals.push(...parts);
  }
  return { interests, goals: dedupe(goals, (x) => x).slice(0, 6) };
}

// ---------------------------------------------------------------- main
export interface RuleResult {
  parsed: Parsed;
  lines: Line[];
  sections: { name: string; firstLine: number; lineCount: number }[];
  matchMode: { mode: "embedding" | "deterministic"; label: string } | null;
}

export async function parseWithRules(items: RawItem[], pages: PageInfo[] = []): Promise<RuleResult> {
  const lines = buildLines(items, pages);
  assignSections(lines);
  const bodySz = bodySize(lines);
  const p = emptyParsed();

  parseHeader(p, lines);
  const { pl, pool } = prepare(lines);
  const contentPl = pl;
  parseEducation(p, contentPl, pool);
  const skillInfo = await parseSkills(p, contentPl);
  parseEntries(p, contentPl, pool, bodySz);

  const sumSec = contentPl.filter((l) => l.section === "summary").map((l) => l.text).join(" ").trim();
  if (sumSec) {
    p.summary = sumSec;
    setField(p, "summary", "cv", "high", "rule:summary.labelled-section");
  }
  p.certifications = parseList(contentPl, "certifications");
  p.awards = parseList(contentPl, "awards");
  if (p.certifications.length) setField(p, "certifications", "cv", "high", "rule:certifications.section");
  else setField(p, "certifications", "optional-missing", "low", "rule:certifications.none");
  if (p.awards.length) setField(p, "awards", "cv", "high", "rule:awards.section");

  // career interests and goals from the summary
  if (p.summary) {
    const t = extractTags(p.summary);
    p.interestTags = t.interests;
    p.goalTags = t.goals;
    if (t.interests.length || t.goals.length) setField(p, "interests", "cv", "medium", "rule:interests.summary-cues");
  }
  if (!p.fields["interests"]) setField(p, "interests", "optional-missing", "low", "rule:interests.none");

  // status
  const cur = p.education.find((e) => e.current && (RANK[e.level] ?? 0) >= 3);
  if (cur) {
    p.status = "student";
    setField(p, "status", "inferred", "medium", "rule:status.current-degree");
  } else if (p.entries.some((e) => e.kind === "work" && /\b(now|present|current|ongoing)\b/i.test(e.dates))) {
    p.status = "employed";
    setField(p, "status", "inferred", "medium", "rule:status.current-job");
  }

  // Skills inferred from project descriptions when the CV has no skills section.
  let matchMode = skillInfo.mode;
  if (p.technicalSkills.length === 0 && p.humanSkills.length === 0 && p.entries.length > 0) {
    const units = p.entries.flatMap((e) =>
      e.description
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.length > 8)
        .map((s) => ({ text: s, from: e.title })),
    );
    if (units.length) {
      const scored = await scoreTexts(units.map((u) => u.text));
      matchMode = { mode: scored.mode, label: scored.modeLabel };
      const thr = scored.mode === "embedding" ? 0.5 : 0.6;
      const catalogue = getSkills();
      const best = new Map<number, { s: number; from: string; text: string }>();
      units.forEach((u, i) => {
        (scored.matrix[i] ?? []).forEach((v, j) => {
          if (v >= thr && v > (best.get(j)?.s ?? 0)) best.set(j, { s: v, from: u.from, text: u.text });
        });
      });
      p.inferredSkills = [...best.entries()]
        .sort((a, b) => b[1].s - a[1].s)
        .slice(0, 8)
        .map(([j, b]) => ({ name: catalogue[j]!.name, category: catalogue[j]!.category, evidence: `"${b.text}" from ${b.from}` }));
      if (p.inferredSkills.length) {
        setField(p, "technicalSkills", "inferred", "low", "rule:skills.inferred-from-projects");
      }
    }
  }
  if (!p.fields["technicalSkills"]) setField(p, "technicalSkills", "missing", "low", "rule:skills.none");
  if (!p.fields["humanSkills"]) setField(p, "humanSkills", "missing", "low", "rule:skills.none");
  if (!p.fields["languages"]) setField(p, "languages", "optional-missing", "low", "rule:languages.none");

  if (!matchMode) {
    const pm = await probeMode();
    matchMode = { mode: pm.mode, label: pm.modeLabel };
  }

  const sections: RuleResult["sections"] = [];
  lines.forEach((l, i) => {
    if (isHeadingLine(l)) return;
    const last = sections[sections.length - 1];
    if (last && last.name === l.section) last.lineCount++;
    else sections.push({ name: l.section, firstLine: i, lineCount: 1 });
  });
  return { parsed: p, lines, sections, matchMode };
}

export function itemsOrText(opts: { items?: RawItem[]; text?: string }): RawItem[] {
  if (opts.items && opts.items.length) return opts.items;
  return itemsFromText(opts.text ?? "");
}

export type { ParsedEntry };
