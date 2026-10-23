import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface SkillRec {
  id: string;
  name: string;
  category: "technical" | "professional";
  synonyms: string[];
}
export interface OccupationRec {
  id: string;
  title: string;
  industry: string;
  description: string;
  interestKeywords: string[];
  relatedMajors: string[];
  requiredSkills: { skillId: string; importance: number }[];
}
export interface SdgRec {
  number: number;
  name: string;
  color: string;
}
export interface SdgMapping {
  sdg: number;
  justification: string;
}
export interface SdgData {
  sdgs: SdgRec[];
  occupations: Record<string, SdgMapping[]>;
  skills: Record<string, SdgMapping[]>;
}
export interface TrendRec {
  id: string;
  title: string;
  summary: string;
  industries: string[];
  skills: string[];
  occupations: string[];
  sourceName: string;
  sourceUrl: string;
  publishedDate: string;
  fields?: string[];
  geography?: string;
  evidenceType?: "Observed" | "Externally forecast" | "Illustrative";
  risingSkills?: string[];
}
export interface TrendsFile {
  lastUpdated: string;
  items: TrendRec[];
  fields?: { id: string; name: string; occupations: string[] }[];
  outlook?: { fieldId: string; skills: { skillId: string; direction: "rising" | "stable" | "declining"; trendIds: string[] }[] }[];
}
export interface ScenarioFile {
  disclaimer: string;
  global: {
    gradual: { label: string; assumptions: string[] };
    rapid: { label: string; assumptions: string[] };
  };
  occupations: Record<
    string,
    {
      skills: Record<string, [number, number, number]>;
      actions: { gradual: string[]; rapid: string[] };
    }
  >;
}
export interface CourseRec {
  activity: string;
  duration: string;
  durationBasis: "provider-stated" | "estimated";
  resources: { title: string; provider: string; url: string }[];
}

function dataDir(): string {
  const candidates = [
    process.env["NEXPATH_DATA_DIR"],
    path.resolve(process.cwd(), "data"),
    path.resolve(process.cwd(), "artifacts/api-server/data"),
  ].filter((p): p is string => Boolean(p));
  for (const c of candidates) {
    if (existsSync(path.join(c, "skills.json"))) return c;
  }
  throw new Error(`Could not locate data directory. Tried: ${candidates.join(", ")}`);
}

// Files are re-read on each call (they are small) so edits to data/*.json
// take effect without a rebuild.
function load<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(dataDir(), file), "utf8")) as T;
}

export const getSkills = () => load<SkillRec[]>("skills.json");
export const getOccupations = () => load<OccupationRec[]>("occupations.json");
export const getSdgData = () => load<SdgData>("sdg_mappings.json");
export const getTrends = () => load<TrendsFile>("trends.json");
export const getScenarios = () => load<ScenarioFile>("scenarios.json");
export const getCourses = () => load<Record<string, CourseRec>>("courses.json");
