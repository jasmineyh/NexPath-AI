export interface RawItem {
  text: string;
  x: number;
  y: number; // distance from top of page
  w: number;
  size: number;
  page: number;
  bold?: boolean;
}

export interface PageInfo {
  width: number;
  height: number;
}

export interface Cell {
  text: string;
  x: number;
  xEnd: number;
  size: number;
}

export type Col = "L" | "R" | "S";

export interface Line {
  text: string; // cells joined with two spaces
  cells: Cell[];
  x: number;
  xEnd: number;
  y: number;
  size: number;
  bold: boolean;
  page: number;
  col: Col;
  /** index in reading order */
  idx: number;
  section: SectionId;
}

export type SectionId =
  | "header"
  | "contact"
  | "summary"
  | "education"
  | "experience"
  | "projects"
  | "volunteer"
  | "awards"
  | "certifications"
  | "skills"
  | "skills-technical"
  | "skills-soft"
  | "languages"
  | "other";

export type EntryKind = "work" | "internship" | "project" | "competition" | "volunteer";

export interface ParsedEducation {
  institution: string;
  qualification: string;
  level: string;
  field: string;
  specialisation: string;
  results: string;
  dates: string;
  current: boolean;
}

export interface ParsedSkill {
  name: string;
  category: string;
  proficiency: string;
}

export interface ParsedLanguage {
  name: string;
  proficiency: string;
}

export interface ParsedEntry {
  title: string;
  org: string;
  role: string;
  award: string;
  dates: string;
  description: string;
  kind: EntryKind;
}

export type FieldStatus = "cv" | "inferred" | "missing" | "optional-missing" | "check";
export type Confidence = "high" | "medium" | "low";

export interface FieldMeta {
  status: FieldStatus;
  confidence: Confidence;
  source: string;
}

export interface Parsed {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
  summary: string;
  interestTags: string[];
  goalTags: string[];
  education: ParsedEducation[];
  technicalSkills: ParsedSkill[];
  humanSkills: string[];
  languages: ParsedLanguage[];
  entries: ParsedEntry[];
  certifications: string[];
  awards: string[];
  status: string;
  fields: Record<string, FieldMeta>;
  inferredSkills: { name: string; category: string; evidence: string }[];
  notes: string[];
}

export function emptyParsed(): Parsed {
  return {
    name: "",
    email: "",
    phone: "",
    location: "",
    links: [],
    summary: "",
    interestTags: [],
    goalTags: [],
    education: [],
    technicalSkills: [],
    humanSkills: [],
    languages: [],
    entries: [],
    certifications: [],
    awards: [],
    status: "",
    fields: {},
    inferredSkills: [],
    notes: [],
  };
}
