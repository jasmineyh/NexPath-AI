/**
 * CV refiner: a post-processing pass over the output of the existing parser.
 * It receives the extracted text plus the parsed result and returns corrected
 * fields. It never throws to the caller's detriment: the single call site in
 * cv.ts wraps it in try/catch and falls back to the original result.
 * Nothing here stores or logs CV text.
 */

interface Exp {
  title: string;
  org: string;
  description: string;
  kind?: string;
  dates?: string;
  role?: string;
}
interface Edu {
  institution: string;
  qualification: string;
  level: string;
  field: string;
  specialisation: string;
  results: string;
  dates: string;
  current: boolean;
}
export interface RefinableProfile {
  name?: string;
  educationLevel: string;
  major: string;
  institution?: string;
  status: string;
  experiences?: Exp[];
  technicalSkills: string[];
  humanSkills: string[];
  selfDescription?: string;
  interests?: string;
  goals?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[];
  certifications?: string[];
  graduation?: string;
  education?: Edu[];
  languages?: string[];
  [k: string]: unknown;
}
export interface RefinableResult {
  profile: RefinableProfile;
  found: string[];
  mode: string;
  modeLabel: string;
}

type Zone = "pre" | "education" | "tech" | "soft" | "skills" | "projects" | "volunteer" | "work" | "certs" | "other";
interface L {
  text: string;
  zone: Zone;
  heading: boolean;
}

const BULLET = /^\s*(?:[-•*▪●◦·‣►>–—]|\d+[.)])\s+/;
const INST = /\b(universiti|university|kolej|college|sekolah|smk|smjk|sjk|school|politeknik|polytechnic|institut|institute|academy|matriculation|matrikulasi)\b/i;
const QUAL = /\b(bachelor|master|doctor|phd|diploma|foundation|sijil|stpm|spm|a-?levels?|b\.?sc|bsc|beng|msc|mba|degree)\b/i;
const RANGE = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(?:expected\s+)?(?:((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?((?:19|20)\d{2})|(now|present|current|ongoing|today))/i;
const MY_PLACES =
  /\b(kuala lumpur|petaling jaya|shah alam|subang jaya|cyberjaya|putrajaya|selangor|penang|pulau pinang|george town|johor bahru|johor|ipoh|perak|melaka|malacca|kuching|sarawak|kota kinabalu|sabah|seremban|negeri sembilan|kedah|kelantan|terengganu|pahang|klang|kajang|bangi|nilai|malaysia|singapore)\b/i;
const TITLE_WORDS = /\b(student|engineer|developer|analyst|intern|graduate|manager|designer|curriculum|vitae|resume|cv|profile|portfolio)\b/i;

function compact(line: string): string {
  return line.toLowerCase().replace(/[^a-z&]/g, "");
}

function isLetterSpaced(line: string): boolean {
  const toks = line.trim().split(/\s+/);
  return toks.length >= 4 && toks.filter((t) => /^[A-Za-z]$/.test(t)).length >= toks.length * 0.6;
}

function headingZone(line: string): Zone | null {
  const t = line.trim().replace(/[:：]+$/, "");
  if (t.length < 3 || t.length > 70 || /[.,;@]/.test(t)) return null;
  const upper = t === t.toUpperCase() && /[A-Z]/.test(t);
  const titleish = /^[A-Za-z&/ -]+$/.test(t) && t.split(/\s+/).length <= 6;
  if (!(upper || isLetterSpaced(t) || titleish)) return null;
  const c = compact(t);
  if (/^(education|academicbackground|educationandtraining|academicqualifications?|qualifications?)$/.test(c)) return "education";
  if (/^(softskills?|interpersonalskills|transferableskills)$/.test(c)) return "soft";
  if (/^(technicalskills?|coreskills|keyskills|technicalskills&tools|skills&tools|tools&technologies|technologies)$/.test(c)) return "tech";
  if (/^(skills?|skills&abilities|competencies)$/.test(c)) return "skills";
  if (/volunteer|cocurricular|extracurricular|leadership&activities|^activities$/.test(c)) return "volunteer";
  if (/project|^academic&/.test(c) && !/education/.test(c)) return "projects";
  if (/^((work|professional|relevant|internship)?experience|internships?|employment(history)?|workhistory|work&internshipexperience)$/.test(c)) return "work";
  if (/^(certifications?|licen[cs]es(&certifications?)?|courses?|training|certificates?)$/.test(c)) return "certs";
  if (/^(summary|profile|objective|careerobjective|aboutme|about|professionalsummary)$/.test(c)) return "other";
  if (/^(references?|referees?|awards?|achievements?|honou?rs|interests?|hobbies|declaration|publications?|languages?)$/.test(c)) return "other";
  return null;
}

function buildLines(text: string): L[] {
  const raw = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  // Join wrapped lines (continuations).
  const joined: string[] = [];
  const open = (s: string) => (s.match(/\(/g) ?? []).length > (s.match(/\)/g) ?? []).length;
  for (const l of raw) {
    const prev = joined[joined.length - 1];
    const isHeading = headingZone(l) !== null;
    if (
      prev !== undefined &&
      !isHeading &&
      headingZone(prev) === null &&
      !BULLET.test(l) &&
      (/,$/.test(prev) || /^\(/.test(l) || open(prev) || (/^[a-z]/.test(l) && !/[.!?]$/.test(prev)))
    ) {
      joined[joined.length - 1] = `${prev} ${l}`;
    } else joined.push(l);
  }
  let zone: Zone = "pre";
  return joined.map((t) => {
    const hz = headingZone(t);
    if (hz) {
      zone = hz;
      return { text: t, zone, heading: true };
    }
    return { text: t, zone, heading: false };
  });
}

const titleCase = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_m, a, b) => a + b.toUpperCase()) : s;

function stripLevel(s: string): string {
  return s.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

function splitItems(s: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of s.split(/[,;|•·●▪]/)) {
    const p = stripLevel(part).replace(/^[-–—:]+|[-–—:.]+$/g, "").trim();
    if (p.length < 1 || p.length > 40 || p.split(/\s+/).length > 5) continue;
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function dedupeCi(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = i.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------------------------------------------------------------- education

type InstType = "university" | "college" | "school";
function instType(s: string): InstType {
  if (/\b(smk|smjk|sjk|sekolah|school)\b/i.test(s)) return "school";
  if (/\b(universiti|university)\b/i.test(s)) return "university";
  return "college";
}

function fmtRange(m: RegExpMatchArray): { text: string; current: boolean } {
  const start = `${m[1] ?? ""}${m[2]}`.trim();
  const exp = /expected/i.test(m[0]) ? "Expected " : "";
  const end = m[5] ? "Present" : `${exp}${m[3] ?? ""}${m[4]}`.trim();
  return { text: `${start} - ${end}`, current: Boolean(m[5]) };
}

interface Atom {
  idx: number;
  run: number;
}

function parseEducation(lines: L[]) {
  const eligible = (l: L) => l.zone === "pre" || l.zone === "education" || l.zone === "tech" || l.zone === "skills" || l.zone === "soft";
  const GRADES = /^(?:\d+\s*[A-C][+-]?(?:\s+|$))+$/;
  const CGPA = /^(?:cgpa|gpa|pngk|results?)\s*[:\-]?\s*\d/i;

  type Kind = "inst" | "qual" | "date" | "result" | "field";
  const kinds = new Map<number, Kind>();
  const consumed = new Set<number>();
  lines.forEach((l, i) => {
    if (l.heading || !eligible(l)) return;
    const t = l.text;
    if (/@/.test(t) || /:\s*\S/.test(t) && !CGPA.test(t)) return;
    const range = t.match(RANGE);
    const rest = range ? t.replace(RANGE, "").replace(/[()|,–—-]/g, " ").trim() : t;
    if (range && rest.split(/\s+/).filter(Boolean).length <= 1) kinds.set(i, "date");
    else if (CGPA.test(t) || GRADES.test(t)) kinds.set(i, "result");
    else if (INST.test(t) && t.length <= 70) kinds.set(i, "inst");
    else if (QUAL.test(t) && t.length <= 90 && !/[.!?]$/.test(t)) kinds.set(i, "qual");
  });
  // Field lines: short unlabelled line directly before a result line.
  lines.forEach((l, i) => {
    if (kinds.get(i + 1) === "result" && !kinds.has(i) && !l.heading && eligible(l)) {
      const t = l.text;
      if (t.length <= 40 && t.split(/\s+/).length <= 5 && !/[.!?:,]/.test(t) && !/@/.test(t)) kinds.set(i, "field");
    }
  });

  const idxs = [...kinds.keys()].sort((a, b) => a - b);
  // Runs of consecutive atom lines.
  const runOf = new Map<number, number>();
  let run = -1;
  let last = -10;
  for (const i of idxs) {
    if (i !== last + 1) run++;
    runOf.set(i, run);
    last = i;
  }
  const insts = idxs.filter((i) => kinds.get(i) === "inst");
  if (insts.length === 0) return { edu: [] as Edu[], consumed };

  interface Draft {
    idx: number;
    type: InstType;
    institution: string;
    qualification: string;
    field: string;
    results: string;
    dates: string;
    current: boolean;
  }
  const drafts: Draft[] = insts.map((i) => {
    const t = lines[i]!.text;
    const range = t.match(RANGE);
    const inst = t.replace(RANGE, "").replace(/[\s|,–—-]+$/g, "").trim();
    const d: Draft = { idx: i, type: instType(t), institution: inst, qualification: "", field: "", results: "", dates: "", current: false };
    if (range) {
      const r = fmtRange(range);
      d.dates = r.text;
      d.current = r.current;
    }
    return d;
  });
  insts.forEach((i) => consumed.add(i));

  const nearestPreceding = (idx: number, maxDist = 4): Draft | undefined => {
    let best: Draft | undefined;
    for (const d of drafts) {
      if (d.idx < idx && idx - d.idx <= maxDist && runOf.get(d.idx) === runOf.get(idx)) best = d;
    }
    return best;
  };

  // Dates: pair by order inside a run when counts match, else nearest preceding institution.
  const dateIdx = idxs.filter((i) => kinds.get(i) === "date");
  const byRun = new Map<number, number[]>();
  for (const i of dateIdx) byRun.set(runOf.get(i)!, [...(byRun.get(runOf.get(i)!) ?? []), i]);
  for (const [r, ds] of byRun) {
    const rd = drafts.filter((d) => runOf.get(d.idx) === r);
    ds.forEach((di, k) => {
      const m = lines[di]!.text.match(RANGE)!;
      const fm = fmtRange(m);
      const target = rd.length === ds.length ? rd[k] : nearestPreceding(di, 6) ?? rd[rd.length - 1];
      if (target && !target.dates) {
        target.dates = fm.text;
        target.current = fm.current;
        consumed.add(di);
      }
    });
  }

  // Qualifications.
  for (const i of idxs.filter((x) => kinds.get(x) === "qual")) {
    const t = lines[i]!.text;
    const degree = /\b(bachelor|master|doctor|phd|b\.?sc|bsc|beng|msc|mba|degree)\b/i.test(t);
    const pool = drafts.filter((d) => !d.qualification);
    const sameRun = pool.filter((d) => runOf.get(d.idx) === runOf.get(i));
    const pick = (arr: Draft[]) => (degree ? arr.find((d) => d.type === "university") : arr.find((d) => d.type !== "school")) ?? undefined;
    const target = pick(sameRun) ?? pick(pool) ?? nearestPreceding(i, 4);
    if (target) {
      target.qualification = t;
      consumed.add(i);
    }
  }

  // Results and fields.
  for (const i of idxs.filter((x) => kinds.get(x) === "result")) {
    const t = lines[i]!.text;
    const isGrades = GRADES.test(t);
    const wanted: InstType[] = isGrades ? ["school"] : ["college", "university"];
    const near = nearestPreceding(i, 4);
    let target = near && wanted.includes(near.type) && !near.results ? near : undefined;
    if (!target) {
      for (const ty of wanted) {
        target = drafts.find((d) => d.type === ty && !d.results && (ty !== "university" || !d.current));
        if (target) break;
      }
    }
    if (!target) target = near;
    if (target) {
      target.results = t.replace(/^results?\s*[:\-]?\s*/i, "").trim();
      consumed.add(i);
      if (kinds.get(i - 1) === "field" && !target.field && !target.qualification) {
        target.field = lines[i - 1]!.text;
        consumed.add(i - 1);
      } else if (kinds.get(i - 1) === "field") consumed.add(i - 1);
    }
  }

  const edu: Edu[] = drafts.map((d) => {
    let level = "";
    let field = d.field;
    let specialisation = "";
    if (d.qualification) {
      const q = d.qualification;
      const par = q.match(/\(([^)]+)\)/);
      if (par && !/^(hons|honours)$/i.test(par[1]!.trim())) specialisation = par[1]!.trim();
      const base = q.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
      if (/\b(ph\.?d|doctor)/i.test(base)) level = "PhD";
      else if (/\b(master|msc|mba)\b/i.test(base)) level = "Master's degree";
      else if (/\b(bachelor|bsc|b\.sc|beng|degree)\b/i.test(base)) level = "Bachelor's degree";
      else if (/\bdiploma\b/i.test(base)) level = "Diploma";
      else if (/\b(stpm|a-?level|foundation)\b/i.test(base)) level = "STPM / A-Level / Foundation";
      else if (/\b(spm|o-?level)\b/i.test(base)) level = "SPM / O-Level";
      const m = base.match(/\bin\s+(.+)$/i) ?? base.match(/\bof\s+(.+)$/i);
      field = m ? m[1]!.trim() : base;
      if (field.toLowerCase() === base.toLowerCase() && level) field = base.replace(/^(bachelor|master|doctor|diploma|foundation)\s*(of|in)?\s*/i, "").trim() || base;
    }
    return {
      institution: d.institution,
      qualification: d.qualification,
      level,
      field,
      specialisation,
      results: d.results,
      dates: d.dates,
      current: d.current,
    };
  });
  return { edu, consumed };
}

// -------------------------------------------------------------------- main

function isContactLine(t: string) {
  return /@|https?:|linkedin|github|\+?\d[\d\s-]{7,}\d/i.test(t);
}

export function refineCv(text: string, result: RefinableResult): RefinableResult | null {
  const lines = buildLines(text);
  if (lines.length === 0) return null;
  const out: RefinableResult = JSON.parse(JSON.stringify(result));
  const p = out.profile;
  const found = new Set(out.found);
  const setFound = (k: string, ok: boolean) => (ok ? found.add(k) : found.delete(k));

  const { edu, consumed } = parseEducation(lines);
  const eduIdx = new Set<number>(consumed);

  // 1. Name
  const top = lines.slice(0, 14);
  for (let i = 0; i < top.length; i++) {
    const l = top[i]!;
    if (l.heading || eduIdx.has(i)) continue;
    const t = l.text;
    if (isContactLine(t) || /\d/.test(t) || INST.test(t) || QUAL.test(t) || TITLE_WORDS.test(t)) continue;
    const words = t.split(/\s+/);
    if (words.length < 1 || words.length > 4 || !words.every((w) => /^[A-Za-z.'’-]+$/.test(w))) continue;
    p.name = titleCase(t);
    break;
  }
  setFound("name", Boolean(p.name));

  // Contact: phone / email re-read from the header area only.
  const head = lines.slice(0, 8).map((l) => l.text).join("\n");
  const phone = head.match(/(?:\+?60[\s-]?)?\b0?1\d[\s-]?\d{3,4}[\s-]?\d{3,4}\b/) ?? head.match(/\+\d{1,3}[\s-]?\d[\d\s-]{7,13}\d/);
  if (phone) p.phone = phone[0].trim();
  const email = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (email) p.email = email[0];
  setFound("phone", Boolean(p.phone));
  setFound("email", Boolean(p.email));

  // 2. Location: explicit label or a clear "City, State" in the contact area. Never an institution.
  let location = "";
  for (const l of lines.slice(0, 20)) {
    const m = l.text.match(/^(?:address|location|alamat)\s*[:\-]\s*(.+)$/i);
    if (m) {
      location = m[1]!.trim();
      break;
    }
  }
  if (!location) {
    for (const l of lines.slice(0, 8)) {
      if (l.heading || INST.test(l.text) || QUAL.test(l.text)) continue;
      const seg = l.text
        .split(/\s*[|•·]\s*/)
        .find((s) => /^[A-Z][A-Za-z .'-]+,\s*[A-Za-z .'-]+(\s+\d{5})?$/.test(s.trim()) && MY_PLACES.test(s) && !/@/.test(s) && !INST.test(s));
      if (seg) {
        location = seg.trim();
        break;
      }
    }
  }
  p.location = location;
  setFound("location", Boolean(location));

  // 3. Skills, soft skills and languages.
  const tech: string[] = [];
  const human: string[] = [];
  let languages: string[] = [];
  let sawSkillZone = false;
  lines.forEach((l, i) => {
    if (l.heading || eduIdx.has(i)) return;
    const t = l.text;
    const lang = t.match(/^languages?\s*:\s*(.+)$/i);
    if (lang) {
      languages = dedupeCi([...languages, ...lang[1]!.split(/[,;|]/).map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length >= 2 && s.length <= 40)]);
      return;
    }
    if (l.zone !== "tech" && l.zone !== "soft" && l.zone !== "skills") return;
    if (BULLET.test(t) && false) return;
    sawSkillZone = true;
    const labelled = t.match(/^([A-Za-z][A-Za-z &/+-]{2,40}):\s*(.+)$/);
    const body = (labelled ? labelled[2]! : t.replace(BULLET, "")).trim();
    const isHuman = l.zone === "soft" || (labelled && /\b(soft|interpersonal|transferable|human|people)\b/i.test(labelled[1]!));
    const items = splitItems(body);
    (isHuman ? human : tech).push(...items);
  });
  const techD = dedupeCi(tech);
  const humanD = dedupeCi(human);
  if (sawSkillZone && (techD.length || humanD.length)) {
    p.technicalSkills = techD;
    p.humanSkills = humanD;
  }
  if (languages.length) p.languages = languages;
  else delete p.languages;
  setFound("technicalSkills", p.technicalSkills.length > 0);
  setFound("humanSkills", p.humanSkills.length > 0);
  setFound("languages", languages.length > 0);

  // 4. Education
  if (edu.length > 0) {
    const startYear = (e: Edu) => Number((e.dates.match(/\d{4}/) ?? ["0"])[0]);
    edu.sort((a, b) => Number(b.current) - Number(a.current) || startYear(b) - startYear(a));
    p.education = edu;
    const rank = (e: Edu) => (/PhD/.test(e.level) ? 6 : /Master/.test(e.level) ? 5 : /Bachelor/.test(e.level) ? 4 : /Diploma/.test(e.level) ? 3 : 0);
    const primary = [...edu].sort((a, b) => rank(b) - rank(a) || Number(b.current) - Number(a.current))[0]!;
    if (primary.level) p.educationLevel = primary.level;
    if (primary.field) p.major = primary.field;
    if (primary.institution) p.institution = primary.institution;
    if (primary.dates) p.graduation = primary.dates;
    if (primary.current && rank(primary) >= 3) p.status = "student";
    setFound("education", true);
    setFound("educationLevel", Boolean(p.educationLevel));
    setFound("major", Boolean(p.major));
    setFound("institution", Boolean(p.institution));
    setFound("graduation", Boolean(p.graduation));
    setFound("status", Boolean(p.status));
  }

  // 5. Projects / competitions and volunteer activities.
  const looksLikeDesc = (t: string) =>
    BULLET.test(t) || /^[A-Z][a-z]+(?:ed|ped)\b/.test(t) || /^(Led|Built|Ran|Wrote|Won|Taught|Spoke|Made|Took|Organised|Organized)\b/.test(t);
  const buildEntries = (zone: Zone, kind: string): Exp[] => {
    const entries: Exp[] = [];
    let cur: Exp | null = null;
    let descOpen = false;
    lines.forEach((l) => {
      if (l.heading || l.zone !== zone) return;
      const t = l.text.replace(BULLET, "").trim();
      if (!t) return;
      if (looksLikeDesc(l.text) || (cur && descOpen && !/[.!?]$/.test(cur.description))) {
        if (!cur) return;
        cur.description = cur.description ? `${cur.description} ${t}` : t;
        descOpen = !/[.!?]["”’)]*$/.test(t);
        return;
      }
      const dm = t.match(RANGE);
      const noDates = dm ? t.replace(dm[0], "").replace(/\(\s*\)|\[\s*\]/g, "").replace(/\s{2,}/g, " ").replace(/[\s|,;–—-]+$/g, "").trim() : t;
      const m = noDates.match(/^(.+?)\s+[-–—]\s+(.+)$/);
      cur = { title: (m ? m[1]! : noDates).trim(), org: "", description: "", kind };
      if (dm) cur.dates = fmtRange(dm).text;
      if (m) cur.role = m[2]!.trim();
      entries.push(cur);
      descOpen = false;
    });
    return entries;
  };
  const projects = buildEntries("projects", "project");
  const volunteer = buildEntries("volunteer", "volunteer");

  const existing = p.experiences ?? [];
  const hasWorkHeading = lines.some((l) => l.heading && l.zone === "work");
  const work = hasWorkHeading ? existing.filter((e) => e.kind === "work" || e.kind === "internship") : [];
  const keptProjects = projects.length > 0 ? projects : existing.filter((e) => e.kind === "project");
  const all = [...work, ...keptProjects, ...volunteer];
  p.experiences = all;
  setFound("experiences", all.length > 0);

  // 6. Unlabelled summary paragraph at the top -> goals and "describe what you can do".
  const paraLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.zone !== "pre" || l.heading || eduIdx.has(i)) continue;
    const t = l.text;
    if (isContactLine(t) || t === p.name || t.length < 50 || t.split(/\s+/).length < 8) continue;
    paraLines.push(t);
  }
  const para = paraLines.join(" ").slice(0, 700).trim();
  if (para) {
    p.goals = para;
    p.selfDescription = para;
    setFound("goals", true);
    setFound("selfDescription", true);
  }

  out.found = [...found];
  return out;
}
