import { collapseLetterSpacing } from "./layout";
import type { Line, SectionId } from "./types";

const ALIASES: Record<string, SectionId> = {};
function alias(section: SectionId, ...keys: string[]) {
  for (const k of keys) ALIASES[k] = section;
}

alias("summary", "summary", "professionalsummary", "profile", "careerobjective", "objective", "aboutme", "about", "personalstatement", "careersummary", "profilesummary", "personalprofile");
alias("education", "education", "academicbackground", "academicqualifications", "qualifications", "educationtraining", "educationbackground", "educationalbackground", "academic");
alias("experience", "experience", "workexperience", "professionalexperience", "employmenthistory", "workhistory", "employment", "internship", "internships", "internshipexperience", "relevantexperience", "careerhistory", "workinternshipexperience");
alias("projects", "projects", "project", "projectexperience", "academicprojects", "personalprojects", "keyprojects", "selectedprojects", "academicprojectexperience", "projectsexperience");
alias("volunteer", "volunteer", "volunteering", "volunteerexperience", "activities", "extracurricular", "extracurricularactivities", "leadership", "leadershipexperience", "cocurricular", "cocurricularactivities", "communityinvolvement", "leadershipactivities", "cocurricularvolunteerexperience", "volunteercocurricularexperience");
alias("awards", "awards", "achievements", "honours", "honors", "awardsachievements", "awardshonors", "awardshonours", "honorsawards");
alias("certifications", "certifications", "certification", "certificates", "licenses", "licensescertifications", "courses", "training", "professionaldevelopment", "certificationscourses");
alias("skills", "skills", "technologies", "toolstechnologies", "tools", "coreskills", "keyskills", "itskills", "hardskills", "skillssummary", "technicalcompetencies", "competencies", "skillsabilities");
alias("skills-technical", "technicalskills", "technicalexpertise", "technicalsummary");
alias("skills-soft", "softskills", "interpersonalskills", "personalskills", "softskillspersonaltraits");
alias("languages", "languages", "language", "languageproficiency", "spokenlanguages", "languagesspoken");
alias("contact", "contact", "contactme", "contactinfo", "contactinformation", "personaldetails", "personalinformation", "personalinfo", "contactdetails");
alias("other", "references", "referees", "interests", "hobbies", "declaration", "publications", "hobbiesinterests");

export function sectionKeys(text: string): string[] {
  const t = collapseLetterSpacing(text).toLowerCase().replace(/[:：]+\s*$/, "");
  const withAnd = t.replace(/[^a-z]/g, "");
  const noAnd = t
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter((w) => w && w !== "and")
    .join("")
    .replace(/[^a-z]/g, "");
  return [withAnd, noAnd];
}

/** Returns the section a heading line opens, or null when the line is not a heading. */
export function headingOf(line: Line): SectionId | null {
  const text = line.cells.length === 1 ? line.cells[0]!.text : line.text;
  if (line.cells.length > 1) return null;
  const t = collapseLetterSpacing(text);
  if (t.length < 3 || t.length > 60) return null;
  if (/\d/.test(t)) return null;
  if (t.split(/\s+/).length > 7) return null;
  if (/[:：]\s*\S/.test(t)) return null; // "Languages: English" is a label line, not a heading
  for (const key of sectionKeys(t)) {
    const hit = ALIASES[key];
    if (hit) return hit;
  }
  const key = sectionKeys(t)[1]!;
  if (key.includes("project") && key.length < 40 && !key.includes("management")) return "projects";
  if ((key.includes("volunteer") || key.includes("curricular")) && key.length < 50) return "volunteer";
  return null;
}

export function isHeadingText(text: string): boolean {
  for (const key of sectionKeys(text)) if (ALIASES[key]) return true;
  return false;
}

/** Assign a section to every line, in reading order. */
export function assignSections(lines: Line[]): void {
  let current: SectionId = "header";
  let prevCol: string | null = null;
  for (const l of lines) {
    if (prevCol !== null && l.col !== prevCol) {
      current = "header";
    }
    prevCol = l.col;
    const h = headingOf(l);
    if (h) {
      current = h;
      l.section = "header"; // heading line itself is not content
      (l as Line & { isHeading?: boolean }).isHeading = true;
      continue;
    }
    l.section = current;
  }
}

export function isHeadingLine(l: Line): boolean {
  return Boolean((l as Line & { isHeading?: boolean }).isHeading);
}
