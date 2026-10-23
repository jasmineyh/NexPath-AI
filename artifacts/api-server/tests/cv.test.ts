/**
 * CV parser tests. Run: pnpm --filter @workspace/api-server exec tsx tests/cv.test.ts
 * Runs in rules mode, plus llm mode when LLM_PROVIDER and LLM_API_KEY are set.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { analyseCv } from "../src/lib/cv";
import { itemsFromDocxHtml, itemsFromPdf, itemsFromPlainText, type PdfJsLike } from "../../nexpath/src/lib/cv-extract-core";

const FIX = path.resolve(import.meta.dirname, "../../../tests/fixtures");
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `   -> got ${JSON.stringify(detail)}`}`);
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sameSet = (a: string[], b: string[]) => eq([...a].map((s) => s.toLowerCase()).sort(), [...b].map((s) => s.toLowerCase()).sort());

async function pdfItems(file: string) {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfJsLike;
  return itemsFromPdf(pdfjs, new Uint8Array(readFileSync(file)));
}

async function twoColumn(label: string, file: string) {
  console.log(`\n=== ${label}: ${path.basename(file)} ===`);
  const { items, pages } = await pdfItems(file);
  const r = await analyseCv({ items, pages, useAi: false, debug: true });
  const p = r.profile;
  const ent = p.experiences ?? [];
  const proj = ent.filter((e) => e.kind === "project" || e.kind === "competition");
  const vol = ent.filter((e) => e.kind === "volunteer");
  check("extraction mode is rule-based", r.extractionLabel === "Extraction mode: Rule-based", r.extractionLabel);
  check("name = Farah", p.name === "Farah", p.name);
  check("phone = 012-3456789", p.phone === "012-3456789", p.phone);
  check("email = noidea@gmail.com", p.email === "noidea@gmail.com", p.email);
  check("location empty (not from institution/event)", !p.location, p.location);
  check("summary verbatim", (p.summary ?? "").startsWith("Computer Science student specialising in Data Engineering") && (p.summary ?? "").endsWith("efficiency and security."), p.summary);
  check("interest tags include 'data specialist'", (p.interestTags ?? []).includes("data specialist"), p.interestTags);
  check("goal tags include 'design useful systems'", (p.interestTags ?? []).some((t) => /design useful systems/i.test(t)), p.interestTags);
  check("describe-yourself field = summary paragraph", p.selfDescription === p.summary, p.selfDescription);
  const edu = p.education ?? [];
  check("3 education entries", edu.length === 3, edu.map((e) => e.institution));
  check("edu1 UTM | Bachelor | 2025 - now | current", edu[0]?.institution === "Universiti Teknologi Malaysia" && /Bachelor of Computer Science/.test(edu[0]?.qualification ?? "") && /2025\s*-\s*now/.test(edu[0]?.dates ?? "") && edu[0]?.current === true, edu[0]);
  check("edu1 level/field/specialisation", edu[0]?.level === "Bachelor's degree" && edu[0]?.field === "Computer Science" && edu[0]?.specialisation === "Data Engineering", edu[0]);
  check("edu2 Kolej Matrikulasi | Physical Science | 2024 - 2025 | CGPA 4.00", edu[1]?.institution === "Kolej Matrikulasi Pulau Pinang" && edu[1]?.qualification === "Physical Science" && /2024\s*-\s*2025/.test(edu[1]?.dates ?? "") && /CGPA\s*4\.00/.test(edu[1]?.results ?? ""), edu[1]);
  check("edu3 SMK Mahmud | STEM B | 2022 - 2024 | 3A+ 6A 2A-", edu[2]?.institution === "SMK Mahmud" && edu[2]?.qualification === "STEM B" && /2022\s*-\s*2024/.test(edu[2]?.dates ?? "") && /3A\+\s*6A\s*2A-/.test(edu[2]?.results ?? ""), edu[2]);
  check("edu2 pre-university, edu3 secondary", edu[1]?.level === "STPM / A-Level / Foundation" && edu[2]?.level === "SPM / O-Level", [edu[1]?.level, edu[2]?.level]);
  check("status Student", p.status === "student", p.status);
  check("survey level Bachelor's, major Computer Science, institution UTM", p.educationLevel === "Bachelor's degree" && p.major === "Computer Science" && p.institution === "Universiti Teknologi Malaysia", [p.educationLevel, p.major, p.institution]);
  const techExp = ["C++", "Java", "R", "Python", "HTML", "CSS", "Git", "GitHub", "Flutter", "VS Code", "Firebase", "Data Visualization", "Google Gemini API", "Canva", "Figma", "CapCut"];
  check("technical skills match (R once)", sameSet(p.technicalSkills, techExp), p.technicalSkills);
  const py = (p.skillDetails ?? []).find((s) => s.name === "Python");
  check("Python proficiency basic", py?.proficiency === "basic", py);
  check("human skills match", sameSet(p.humanSkills, ["Communication", "Problem-solving", "Critical thinking"]), p.humanSkills);
  check("languages English/Malay/Chinese with proficiency", eq((p.languages ?? []).map((l) => `${l.name}:${l.proficiency}`), ["English:Fluent", "Malay:Fluent", "Chinese:Native"]), p.languages);
  check("no language in skill lists", ![...p.technicalSkills, ...p.humanSkills].some((s) => /^(english|malay|chinese)/i.test(s)), null);
  check("7 projects/competitions", proj.length === 7, proj.map((e) => e.title));
  const titles = ["UTM x HACKATHON 2026", "PutraHack 2026", "Varsity Hackathon 2026", "KitaHack 2026", "NexG Godamlah! 2.0: Smart ID Hackathon 2025", "Bridge Design Challenge Competition", "MATRIX eXTRA CHALLENGE (MeX-Q)"];
  check("project titles", eq(proj.map((e) => e.title), titles), proj.map((e) => e.title));
  check("UTM award Top 10 Finalist", proj[0]?.award === "Top 10 Finalist", proj[0]);
  check("Bridge Bronze Award, 2-line description merged, typo kept", proj[5]?.award === "Bronze Award" && /bridge/i.test(proj[5]?.description ?? "") && /dept trap/.test(proj[5]?.description ?? ""), proj[5]);
  check("MeX-Q Silver Award", proj[6]?.award === "Silver Award", proj[6]);
  check("organisation left empty for projects", proj.every((e) => !e.org), proj.map((e) => e.org));
  check("2 volunteer entries", vol.length === 2, vol.map((e) => e.title));
  check("Cyber Skills role Technical Unit Crew", vol[0]?.title === "Cyber Skills Level-Up! 2026" && vol[0]?.role === "Technical Unit Crew", vol[0]);
  check("Poetry role Head of Organising Committee", vol[1]?.title === "Chinese Poetry Recitation Competition 2023" && vol[1]?.role === "Head of Organising Committee", vol[1]);
  check("no work experience", !ent.some((e) => e.kind === "work" || e.kind === "internship"), ent.map((e) => e.kind));
  check("debug output present", Boolean(r.debug && r.debug.lines.length > 20 && r.debug.sections.length > 3 && r.debug.raw.length > 100), null);
  check("every field has a source", Object.values(r.fields).every((f) => f.source), null);
  console.log(`stats: ${JSON.stringify(r.stats)}`);
  return r;
}

async function main() {
  const files: [string, string][] = [["synthetic equivalent", path.join(FIX, "synthetic_two_column.pdf")]];
  if (existsSync(path.join(FIX, "Example_resume_SDC.pdf"))) files.unshift(["user fixture", path.join(FIX, "Example_resume_SDC.pdf")]);
  let last: Awaited<ReturnType<typeof twoColumn>> | null = null;
  for (const [l, f] of files) last = await twoColumn(l, f);

  console.log("\n=== single-column PDF ===");
  const sc = await pdfItems(path.join(FIX, "single_column.pdf"));
  const a = (await analyseCv({ items: sc.items, pages: sc.pages, useAi: false })).profile;
  const x = a.experiences ?? [];
  check("name", a.name === "Amirul Hakim Bin Rosli" || a.name === "AMIRUL HAKIM BIN ROSLI" || /amirul hakim/i.test(a.name), a.name);
  check("email/phone", a.email === "amirul.hakim@example.com" && a.phone === "016-234 5678", [a.email, a.phone]);
  check("address line gives location", /Kuala Lumpur/.test(a.location ?? ""), a.location);
  check("2 work entries (job + internship)", x.filter((e) => e.kind === "work" || e.kind === "internship").length === 2, x);
  check("job title and employer", x[0]?.title === "Software Developer" && /Axiata/.test(x[0]?.org ?? "") && /Present/i.test(x[0]?.dates ?? ""), x[0]);
  check("education Bachelor / Computer Science / Universiti Malaya", a.educationLevel === "Bachelor's degree" && a.major === "Computer Science" && a.institution === "Universiti Malaya", [a.educationLevel, a.major, a.institution]);
  check("skills split by label", a.technicalSkills.includes("Python") && a.technicalSkills.includes("Docker") && a.humanSkills.includes("Teamwork"), [a.technicalSkills, a.humanSkills]);
  check("certification", (a.certifications ?? []).some((c) => /AWS/.test(c)), a.certifications);

  console.log("\n=== DOCX ===");
  const html = (await mammoth.convertToHtml({ buffer: readFileSync(path.join(FIX, "conventional.docx")) })).value;
  const dr = (await analyseCv({ items: itemsFromDocxHtml(html), useAi: false })).profile;
  const dx = dr.experiences ?? [];
  check("name", dr.name === "Nurul Aisyah binti Hamzah", dr.name);
  check("email/phone", dr.email === "aisyah.hamzah@example.com" && dr.phone === "011-2345 6789", [dr.email, dr.phone]);
  check("location Georgetown, Penang", /Penang/.test(dr.location ?? ""), dr.location);
  check("work entry with employer", dx[0]?.kind === "work" && /Marketing Executive/.test(dx[0]?.title ?? "") && /Penang Foods/.test(dx[0]?.org ?? ""), dx[0]);
  check("education Bachelor / Management", dr.educationLevel === "Bachelor's degree" && /Management/.test(dr.major) && /Sains/.test(dr.institution), [dr.educationLevel, dr.major, dr.institution]);
  check("skills present", dr.technicalSkills.length + dr.humanSkills.length >= 4, [dr.technicalSkills, dr.humanSkills]);

  console.log("\n=== plain text ===");
  const txt = "Siti Nur\nsiti@example.com\n012-3456789\n\nEducation\nUniversiti Malaya\nBachelor of Arts in Linguistics 2020 - 2024\n\nSkills\nWriting, Research\n";
  const tr = (await analyseCv({ items: itemsFromPlainText(txt), useAi: false })).profile;
  check("txt parses name/email/education", tr.name === "Siti Nur" && tr.email === "siti@example.com" && tr.institution === "Universiti Malaya", [tr.name, tr.email, tr.institution]);

  if (process.env["LLM_PROVIDER"] && process.env["LLM_API_KEY"]) {
    console.log("\n=== llm mode ===");
    const f = files[0]![1];
    const { items, pages } = await pdfItems(f);
    const r = await analyseCv({ items, pages });
    check("llm mode used (or silent fallback)", r.extractionMode === "llm" || r.extractionMode === "rules", r.extractionMode);
  } else console.log("\n(llm mode not tested: LLM_PROVIDER / LLM_API_KEY not set)");

  if (last && process.env["SHOW_JSON"]) console.log(JSON.stringify(last.profile, null, 2));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
void main();
