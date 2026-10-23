import { getSkills } from "./data";
import { scoreTexts } from "./matcher";
import { refineCv, type RefinableResult } from "./cvRefiner";

/**
 * Rule-based CV text extraction. No LLM. Nothing here stores or logs the text.
 * Fields that cannot be found are left empty and are not listed in `found`.
 */

type Section = "summary" | "education" | "experience" | "projects" | "skills" | "certifications" | "other";

const HEADINGS: [Section, RegExp][] = [
  ["summary", /^(professional\s+)?(summary|profile|objective|career objective|about me|about)$/i],
  ["education", /^(education|academic background|academic qualifications?|education and training|qualifications?)$/i],
  [
    "experience",
    /^((work|professional|relevant|internship)\s+)?(experience|history|employment( history)?)s?(\s+and\s+internships?)?$|^internships?$|^employment$/i,
  ],
  ["projects", /^((academic|personal|key|selected|relevant)\s+)?projects?(\s+experience)?$/i],
  [
    "skills",
    /^((technical|core|key|professional|soft|hard|it)\s+)?(skills?|competenc(y|ies)|technologies|tools?( and technologies)?|skills? (and|&) (tools|technologies|abilities))$/i,
  ],
  ["certifications", /^(certifications?|licen[cs]es( and certifications?)?|courses?|training|professional development|certificates?|awards? (and|&) certifications?)$/i],
  [
    "other",
    /^(languages?|references?|referees?|awards?|achievements?|honou?rs?|interests?|hobbies|activities|extracurricular( activities)?|volunteer(ing)?( experience)?|leadership|publications?|declaration|co-?curricular( activities)?)$/i,
  ],
];

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE_RANGE = new RegExp(
  `(?:${MONTH}\\.?,?\\s+)?(?:19|20)\\d{2}\\s*(?:-|–|—|to)\\s*(?:(?:${MONTH}\\.?,?\\s+)?(?:19|20)\\d{2}|present|current|now|ongoing)`,
  "i",
);
const SINGLE_DATE = new RegExp(`(?:${MONTH}\\.?,?\\s+)?(?:19|20)\\d{2}`, "i");

const MY_PLACES =
  "Kuala Lumpur|Petaling Jaya|Shah Alam|Subang Jaya|Cyberjaya|Putrajaya|Selangor|Penang|George Town|Johor Bahru|Johor|Ipoh|Perak|Melaka|Malacca|Kuching|Sarawak|Kota Kinabalu|Sabah|Seremban|Negeri Sembilan|Kedah|Kelantan|Terengganu|Pahang|Klang|Kajang|Bangi|Nilai|Malaysia";
const ORG_HINT = /\b(sdn\.?\s*bhd\.?|bhd|berhad|inc\.?|ltd\.?|llc|corp(oration)?|company|group|technolog(y|ies)|labs?|bank|university|universiti|college|institute|startup|solutions|systems|consulting|agency|studio|centre|center|hospital|ministry|foundation)\b/i;

const BULLET = /^\s*(?:[-•*▪●◦·‣►>–—]|\d+[.)])\s+/;

function cleanLine(l: string) {
  return l.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/\s+/g, " ").trim();
}

function detectHeading(line: string): Section | null {
  const t = line.replace(/[:：]+$/, "").replace(/[_=*#-]{2,}/g, "").trim();
  if (t.length < 3 || t.length > 45) return null;
  for (const [sec, re] of HEADINGS) if (re.test(t)) return sec;
  return null;
}

function splitSections(lines: string[]): { header: string[]; sections: Record<Section, string[]> } {
  const sections: Record<Section, string[]> = {
    summary: [],
    education: [],
    experience: [],
    projects: [],
    skills: [],
    certifications: [],
    other: [],
  };
  const header: string[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const h = detectHeading(line);
    if (h) {
      current = h;
      continue;
    }
    if (current === null) header.push(line);
    else sections[current].push(line);
  }
  return { header, sections };
}

export interface CvEntry {
  title: string;
  org: string;
  description: string;
  kind: "work" | "internship" | "project";
  dates?: string;
}

function parseEntries(lines: string[], projects: boolean): { entries: CvEntry[]; bullets: string[] } {
  interface Raw {
    head: string[];
    bullets: string[];
    paras: string[];
  }
  const raws: Raw[] = [];
  let cur: Raw | null = null;
  let prevBullet = false;
  for (const line of lines) {
    const isBullet = BULLET.test(line);
    const text = line.replace(BULLET, "").trim();
    if (!text) continue;
    if (isBullet) {
      if (!cur) cur = { head: [], bullets: [], paras: [] };
      if (!raws.includes(cur)) raws.push(cur);
      cur.bullets.push(text);
      prevBullet = true;
      continue;
    }
    const hasDate = DATE_RANGE.test(text);
    const short = text.length < 100;
    const startsNew =
      !cur ||
      (cur.bullets.length > 0 && short) ||
      (cur.paras.length > 0 && short && hasDate) ||
      (hasDate && cur.head.some((h) => DATE_RANGE.test(h)));
    if (startsNew) {
      cur = { head: [], bullets: [], paras: [] };
      raws.push(cur);
    }
    if (cur!.bullets.length === 0 && cur!.paras.length === 0 && cur!.head.length < 3 && short) cur!.head.push(text);
    else cur!.paras.push(text);
    prevBullet = false;
  }
  void prevBullet;

  const entries: CvEntry[] = [];
  const allBullets: string[] = [];
  for (const r of raws) {
    if (r.head.length === 0 && r.bullets.length === 0) continue;
    let dates: string | undefined;
    const headParts: string[] = [];
    for (const h of r.head) {
      const m = h.match(DATE_RANGE) ?? h.match(SINGLE_DATE);
      let rest = h;
      if (m) {
        dates = dates ?? m[0].trim();
        rest = h.replace(m[0], "").replace(/[()[\]]/g, " ");
      }
      rest = rest.replace(/^[\s|,;:–—-]+|[\s|,;:–—-]+$/g, "").replace(/\s{2,}/g, " ");
      if (rest) headParts.push(rest);
    }
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
      } else {
        const comma = one.split(/,\s+/);
        if (comma.length >= 2 && ORG_HINT.test(comma.slice(1).join(", "))) {
          title = comma[0]!;
          org = comma.slice(1).join(", ");
        } else title = one;
      }
    }
    const descParts = [...r.paras, ...r.bullets].map((b) => b.replace(/\s+/g, " ").trim());
    allBullets.push(...r.bullets);
    const description = descParts.map((d) => (/[.!?]$/.test(d) ? d : `${d}.`)).join(" ");
    if (!title && !description) continue;
    entries.push({
      title: title || (projects ? "Project" : "Role"),
      org,
      description,
      kind: projects ? "project" : /intern|attachment|practicum|trainee/i.test(title + " " + org) ? "internship" : "work",
      dates,
    });
  }
  return { entries, bullets: allBullets };
}

function parseEducation(lines: string[]) {
  const text = lines.join("\n");
  type Lvl = { level: string; rank: number };
  const levelOf = (s: string): Lvl | null => {
    if (/\b(ph\.?d|doctorate|doctor of philosophy)\b/i.test(s)) return { level: "PhD", rank: 6 };
    if (/\b(master|msc|m\.sc|mba|m\.eng|meng|ma)\b/i.test(s)) return { level: "Master's degree", rank: 5 };
    if (/\b(bachelor|bsc|b\.sc|b\.eng|beng|b\.a|ba|b\.tech|btech|b\.comp|degree)\b/i.test(s))
      return { level: "Bachelor's degree", rank: 4 };
    if (/\b(diploma|advanced diploma)\b/i.test(s)) return { level: "Diploma", rank: 3 };
    if (/\b(stpm|a-?level|foundation|matriculation|asasi)\b/i.test(s)) return { level: "STPM / A-Level / Foundation", rank: 2 };
    if (/\b(spm|o-?level|igcse)\b/i.test(s)) return { level: "SPM / O-Level", rank: 1 };
    return null;
  };
  // Group lines into blocks around each degree line.
  let best: { lvl: Lvl; degreeLine: string; idx: number } | null = null;
  lines.forEach((l, idx) => {
    const lvl = levelOf(l);
    if (lvl && (!best || lvl.rank > best.lvl.rank)) best = { lvl, degreeLine: l, idx };
  });
  const b = best as { lvl: Lvl; degreeLine: string; idx: number } | null;
  if (!b) {
    const inst = lines.find((l) => /\b(universiti|university|college|institute|politeknik)\b/i.test(l));
    return { educationLevel: "", major: "", institution: inst ? cleanInstitution(inst) : "", graduation: "" };
  }
  const near = lines.slice(Math.max(0, b.idx - 2), b.idx + 4);
  const instLine = near.find((l) => /\b(universiti|university|college|institute|politeknik|school)\b/i.test(l));
  let institution = "";
  if (instLine) institution = cleanInstitution(instLine);
  else {
    const seg = b.degreeLine.split(/[,|–—]/).map((x) => x.trim()).find((x) => /\b(universiti|university|college|institute)\b/i.test(x));
    if (seg) institution = cleanInstitution(seg);
  }

  // Major: after "in"/"of" or after the degree abbreviation.
  let degree = b.degreeLine.replace(DATE_RANGE, "").replace(SINGLE_DATE, "");
  degree = degree.split(/[|–—]/)[0]!.split(/,\s*(?=universiti|university|college)/i)[0]!;
  let major = "";
  const inMatch = degree.match(/\bin\s+(.+?)(?:\s*\(|\s*,|$)/i) ?? degree.match(/\bof\s+(.+?)(?:\s*\(|\s*,|$)/i);
  if (inMatch && !/^(science|arts|engineering|philosophy|business administration)$/i.test(inMatch[1]!.trim())) {
    major = inMatch[1]!.trim();
  }
  if (!major) {
    const abbr = degree.match(/\b(?:b\.?sc\.?|b\.?eng\.?|b\.?a\.?|b\.?tech|m\.?sc\.?|m\.?eng\.?|mba|diploma)\b[\s.:-]*(?:\(hons\)\s*)?(.+)/i);
    if (abbr) major = abbr[0].trim();
  }
  if (!major) major = degree.trim();
  major = major.replace(/\s*\((?:hons|honours)\)\s*/i, " ").replace(/^[\s,:-]+|[\s,:-]+$/g, "").trim();
  if (/\b(universiti|university)\b/i.test(major)) major = "";

  const years = [...text.matchAll(/\b(?:19|20)\d{2}\b/g)].map((m) => m[0]);
  const expected = /expected|anticipated|present|current/i.test(near.join(" "));
  const gradYear = years.length ? years.reduce((a, c) => (c > a ? c : a)) : "";
  return {
    educationLevel: b.lvl.level,
    major,
    institution,
    graduation: gradYear ? `${expected ? "Expected " : ""}${gradYear}` : "",
  };
}

function cleanInstitution(line: string): string {
  const seg = line
    .replace(DATE_RANGE, "")
    .replace(SINGLE_DATE, "")
    .split(/\s+[|–—]\s+|\s*\|\s*/)
    .map((x) => x.trim())
    .find((x) => /\b(universiti|university|college|institute|politeknik|school)\b/i.test(x));
  return (seg ?? line).replace(/^[\s,:-]+|[\s,:-]+$/g, "").trim();
}

function guessStatus(
  edu: { educationLevel: string; graduation: string },
  experiences: CvEntry[],
  eduFound: boolean,
): string {
  const now = new Date().getFullYear();
  const gradYear = Number((edu.graduation.match(/\d{4}/) ?? [""])[0]);
  const current = experiences.some((e) => e.kind === "work" && /present|current|now|ongoing/i.test(e.dates ?? ""));
  if (eduFound && gradYear && (/expected/i.test(edu.graduation) || gradYear > now)) return "student";
  if (current && gradYear && gradYear < now - 2) return "employed";
  if (eduFound && gradYear && gradYear >= now - 2) return "fresh graduate";
  if (current) return "employed";
  if (experiences.some((e) => e.kind === "work")) return "employed";
  return "";
}

function parseSkillItems(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    let l = raw.replace(BULLET, "");
    l = l.replace(/^[A-Za-z &/]{3,30}:\s*/, ""); // "Languages: Python, Java"
    for (const part of l.split(/[,;|•·●▪/]|\s{3,}/)) {
      const p = part.replace(/\([^)]*\)/g, (m) => m).trim().replace(/^[-–—:]+|[-–—:.]+$/g, "").trim();
      if (p.length >= 2 && p.length <= 40 && p.split(/\s+/).length <= 4) out.push(p);
    }
  }
  return out;
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of items) {
    const k = i.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(i);
    }
  }
  return out;
}

export async function analyseCv(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((l) => l.length > 0);
  const { header, sections } = splitSections(lines);
  const found: string[] = [];

  // Contact details
  const headText = [...header, ...lines.slice(0, 12)].join("\n");
  const email = (rawText.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) ?? [""])[0];
  const phoneMatch = headText.match(/(?:\+?60[\s-]?|\b0)1\d[\s-]?\d{3,4}[\s-]?\d{3,4}\b|\+\d{1,3}[\s-]?\d[\d\s-]{7,13}\d/);
  const phone = phoneMatch ? phoneMatch[0].trim() : "";
  const links = dedupe(
    [...rawText.matchAll(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in|github\.com)\/[A-Za-z0-9_\-./%]+/gi)].map((m) =>
      m[0].replace(/[.,;)]+$/, ""),
    ),
  );
  let location = "";
  for (const l of header.slice(0, 8)) {
    const seg = l
      .split(/\s*[|•·]\s*/)
      .find((s) => new RegExp(`\\b(${MY_PLACES})\\b`, "i").test(s) && !/@|linkedin|github|\d{4,}/i.test(s));
    if (seg) {
      location = seg.trim();
      break;
    }
    const m = l.match(new RegExp(`((?:[A-Z][A-Za-z]+\\s?){1,3},\\s*(?:${MY_PLACES}))`));
    if (m) {
      location = m[1]!.trim();
      break;
    }
  }
  let name = "";
  for (const l of header.slice(0, 5)) {
    if (/@|\d|http|linkedin|github|curriculum|resume|\bcv\b/i.test(l)) continue;
    const words = l.split(/\s+/);
    if (words.length >= 2 && words.length <= 5 && words.every((w) => /^[A-Za-z.'’@-]+$/.test(w))) {
      name = words
        .map((w) => (w === w.toUpperCase() && w.length > 2 ? w[0] + w.slice(1).toLowerCase() : w))
        .join(" ");
      break;
    }
  }
  if (name) found.push("name");
  if (email) found.push("email");
  if (phone) found.push("phone");
  if (location) found.push("location");
  if (links.length) found.push("links");

  // Education
  const edu = parseEducation(sections.education);
  if (edu.educationLevel) found.push("educationLevel");
  if (edu.major) found.push("major");
  if (edu.institution) found.push("institution");
  if (edu.graduation) found.push("graduation");

  // Experience + projects
  const exp = parseEntries(sections.experience, false);
  const proj = parseEntries(sections.projects, true);
  const experiences = [...exp.entries, ...proj.entries];
  if (experiences.length) found.push("experiences");

  const status = guessStatus(edu, exp.entries, Boolean(edu.educationLevel));
  if (status) found.push("status");

  // Certifications
  const certifications = dedupe(
    sections.certifications
      .map((l) => l.replace(BULLET, "").trim())
      .filter((l) => l.length >= 3 && l.length <= 160),
  ).slice(0, 12);
  if (certifications.length) found.push("certifications");

  // Skills: split the skills section and classify each item with the SkillMatcher.
  const items = dedupe(parseSkillItems(sections.skills)).slice(0, 60);
  const catalogue = getSkills();
  const scored = await scoreTexts(items.length ? items : ["cv"]);
  const threshold = scored.mode === "embedding" ? 0.5 : 0.6;
  const technicalSkills: string[] = [];
  const humanSkills: string[] = [];
  items.forEach((item, i) => {
    const row = scored.matrix[i] ?? [];
    let bj = -1;
    let bs = 0;
    row.forEach((v, j) => {
      if (v > bs) {
        bs = v;
        bj = j;
      }
    });
    const softHint = /\b(management|leadership|teamwork|communication|collaboration|adaptab|creativ|presentation|negotiation|organi[sz]ation|critical thinking|empathy|public speaking|interpersonal)/i;
    const cat = bj >= 0 && bs >= threshold ? catalogue[bj]!.category : softHint.test(item) ? "professional" : "technical";
    (cat === "professional" ? humanSkills : technicalSkills).push(item);
  });
  if (technicalSkills.length) found.push("technicalSkills");
  if (humanSkills.length) found.push("humanSkills");

  // Self description from the CV's own wording.
  const summaryText = sections.summary.map((l) => l.replace(BULLET, "")).join(" ").trim();
  const bulletPicks = [...exp.entries, ...proj.entries]
    .map((e) => e.description.split(/(?<=[.!?])\s+/)[0] ?? "")
    .filter(Boolean)
    .slice(0, 4);
  const selfDescription = [summaryText, ...bulletPicks].filter(Boolean).join(" ").slice(0, 700).trim();
  if (selfDescription) found.push("selfDescription");

  const base = {
    profile: {
      name,
      educationLevel: edu.educationLevel,
      major: edu.major,
      institution: edu.institution,
      status,
      experiences: experiences.map((e) => ({
        title: e.title,
        org: e.org,
        description: e.description,
        kind: e.kind,
        ...(e.dates ? { dates: e.dates } : {}),
      })),
      technicalSkills,
      humanSkills,
      selfDescription,
      email,
      phone,
      location,
      links,
      certifications,
      graduation: edu.graduation,
    },
    found,
    mode: scored.mode,
    modeLabel: scored.modeLabel,
  };
  // Optional accuracy pass; on any failure the original parse is returned unchanged.
  try {
    const refined = refineCv(rawText, base as unknown as RefinableResult);
    if (refined) return refined as unknown as typeof base;
  } catch {
    /* keep base */
  }
  return base;
}
