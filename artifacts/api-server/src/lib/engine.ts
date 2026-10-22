import {
  getCourses,
  getOccupations,
  getScenarios,
  getSdgData,
  getSkills,
  getTrends,
  type OccupationRec,
  type SkillRec,
  type TrendRec,
} from "./data";
import { scoreTexts, type MatchMode } from "./matcher";
import { phraseSimilarity, splitClauses, tokens } from "./matcher/text";

export interface ProfileInput {
  name?: string;
  educationLevel: string;
  major: string;
  institution?: string;
  status: string;
  experiences?: { title: string; org: string; description: string; kind?: string }[];
  technicalSkills: string[];
  humanSkills: string[];
  selfDescription?: string;
  interests?: string;
  goals?: string;
}

type UnitKind = "stated" | "experience" | "self";
interface Unit {
  text: string;
  kind: UnitKind;
  source: string;
}
interface SkillEvidence {
  sim: number;
  evidence: string | null;
  kind: UnitKind | null;
  /** best similarity from units other than stated tags */
  inferredSim: number;
  inferredEvidence: string | null;
  /** best similarity from stated tags */
  statedSim: number;
}

export interface Analysis {
  mode: MatchMode;
  modeLabel: string;
  fallbackReason: string | null;
  threshold: number;
  skills: SkillRec[];
  evidence: Map<string, SkillEvidence>;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function buildUnits(profile: ProfileInput): Unit[] {
  const units: Unit[] = [];
  const seen = new Set<string>();
  const add = (u: Unit) => {
    const key = `${u.kind}:${u.text.toLowerCase()}`;
    if (u.text.trim().length < 2 || seen.has(key)) return;
    seen.add(key);
    units.push(u);
  };
  for (const s of profile.technicalSkills) add({ text: s.trim(), kind: "stated", source: "your technical skills" });
  for (const s of profile.humanSkills) add({ text: s.trim(), kind: "stated", source: "your transferable skills" });
  for (const e of profile.experiences ?? []) {
    const label = e.org ? `${e.title} at ${e.org}` : e.title;
    add({ text: `${e.title}. ${e.description}`, kind: "experience", source: label });
    add({ text: e.title, kind: "experience", source: label });
    for (const c of splitClauses(e.description)) add({ text: c, kind: "experience", source: label });
  }
  if (profile.selfDescription) {
    for (const c of splitClauses(profile.selfDescription)) {
      add({ text: c, kind: "self", source: "your own description" });
    }
    add({ text: profile.selfDescription, kind: "self", source: "your own description" });
  }
  return units;
}

export async function analyseProfile(profile: ProfileInput): Promise<Analysis> {
  const skills = getSkills();
  const units = buildUnits(profile);
  const scored = await scoreTexts(units.map((u) => u.text));
  const threshold = scored.mode === "embedding" ? 0.5 : 0.6;

  const evidence = new Map<string, SkillEvidence>();
  skills.forEach((skill, j) => {
    const ev: SkillEvidence = {
      sim: 0,
      evidence: null,
      kind: null,
      inferredSim: 0,
      inferredEvidence: null,
      statedSim: 0,
    };
    units.forEach((u, i) => {
      const s = scored.matrix[i]?.[j] ?? 0;
      if (s > ev.sim) {
        ev.sim = s;
        ev.kind = u.kind;
        ev.evidence = u.kind === "stated" ? `"${u.text}" from ${u.source}` : `"${u.text}" from ${u.source}`;
      }
      if (u.kind === "stated") {
        if (s > ev.statedSim) ev.statedSim = s;
      } else if (s > ev.inferredSim) {
        ev.inferredSim = s;
        ev.inferredEvidence = `"${u.text}" from ${u.source}`;
      }
    });
    evidence.set(skill.id, ev);
  });

  return {
    mode: scored.mode,
    modeLabel: scored.modeLabel,
    fallbackReason: scored.fallbackReason,
    threshold,
    skills,
    evidence,
  };
}

function interestScore(profile: ProfileInput, occ: OccupationRec): { score: number; hits: string[]; majorMatch: boolean } {
  const text = [profile.interests, profile.goals, profile.selfDescription].filter(Boolean).join(" ");
  const textTokens = new Set(tokens(text));
  const hits = occ.interestKeywords.filter((kw) => {
    const kt = tokens(kw);
    return kt.length > 0 && kt.every((t) => textTokens.has(t));
  });
  const majorNorm = profile.major.toLowerCase();
  const majorMatch = occ.relatedMajors.some((m) => majorNorm.includes(m) || phraseSimilarity(majorNorm, m) >= 0.8);
  const score = Math.min(1, 0.7 * Math.min(1, hits.length / 3) + 0.3 * (majorMatch ? 1 : 0));
  return { score, hits, majorMatch };
}

export function skillName(skills: SkillRec[], id: string): string {
  return skills.find((s) => s.id === id)?.name ?? id;
}

export function toOccupationDto(occ: OccupationRec, skills: SkillRec[]) {
  const sdg = getSdgData();
  return {
    id: occ.id,
    title: occ.title,
    description: occ.description,
    industry: occ.industry,
    requiredSkills: occ.requiredSkills.map((r) => ({
      skillId: r.skillId,
      name: skillName(skills, r.skillId),
      importance: r.importance,
    })),
    sdgs: (sdg.occupations[occ.id] ?? []).map((m) => m.sdg),
  };
}

export async function matchCareers(profile: ProfileInput) {
  const analysis = await analyseProfile(profile);
  const { skills, evidence, threshold } = analysis;
  const results = getOccupations().map((occ) => {
    let totalImp = 0;
    let credit = 0;
    let semantic = 0;
    const matched: ReturnType<typeof detail>[] = [];
    const missing: ReturnType<typeof detail>[] = [];

    function detail(skillId: string, importance: number, withEvidence: boolean) {
      const ev = evidence.get(skillId);
      return {
        skillId,
        name: skillName(skills, skillId),
        importance,
        similarity: r2(ev?.sim ?? 0),
        evidence: withEvidence ? (ev?.evidence ?? null) : null,
      };
    }

    for (const req of occ.requiredSkills) {
      const sim = evidence.get(req.skillId)?.sim ?? 0;
      totalImp += req.importance;
      semantic += req.importance * Math.min(1, sim);
      if (sim >= threshold) {
        credit += req.importance;
        matched.push(detail(req.skillId, req.importance, true));
      } else {
        credit += req.importance * (sim / threshold) * 0.5;
        missing.push(detail(req.skillId, req.importance, false));
      }
    }
    const coverage = totalImp ? credit / totalImp : 0;
    const semanticMean = totalImp ? semantic / totalImp : 0;
    const interest = interestScore(profile, occ);
    const score = Math.min(98, Math.round(100 * (0.45 * coverage + 0.35 * semanticMean + 0.2 * interest.score)));

    matched.sort((a, b) => b.importance - a.importance || b.similarity - a.similarity);
    missing.sort((a, b) => b.importance - a.importance);

    const reasons: string[] = [];
    if (matched.length > 0) {
      reasons.push(
        `You already show evidence for ${matched
          .slice(0, 4)
          .map((m) => m.name)
          .join(", ")}, which ${matched.length === 1 ? "is" : "are"} required for ${occ.title} roles.`,
      );
    } else {
      reasons.push(`Your profile shows little direct evidence for the core skills of ${occ.title} roles yet.`);
    }
    if (missing.length > 0) {
      reasons.push(
        `Main gaps to work on: ${missing
          .slice(0, 3)
          .map((m) => m.name)
          .join(", ")}.`,
      );
    } else {
      reasons.push("No required skills are missing from the information you provided.");
    }
    if (interest.hits.length > 0) {
      reasons.push(`Your interests mention ${interest.hits.slice(0, 3).join(", ")}, which align with this career.`);
    }
    if (interest.majorMatch) {
      reasons.push(`Your field of study (${profile.major}) is commonly related to this career.`);
    }

    return {
      occupation: toOccupationDto(occ, skills),
      score,
      coverage: Math.round(coverage * 100),
      interestAlignment: Math.round(interest.score * 100),
      matchedSkills: matched,
      missingSkills: missing,
      reasons,
    };
  });
  results.sort((a, b) => b.score - a.score);
  return { analysis, mode: analysis.mode, modeLabel: analysis.modeLabel, results };
}

function mapTrend(t: TrendRec, skills: SkillRec[], occs: OccupationRec[]) {
  return {
    id: t.id,
    title: t.title,
    summary: t.summary,
    industries: t.industries,
    skills: t.skills.map((s) => skillName(skills, s)),
    occupations: t.occupations.map((o) => occs.find((x) => x.id === o)?.title ?? o),
    sourceName: t.sourceName,
    sourceUrl: t.sourceUrl,
    publishedDate: t.publishedDate,
  };
}

export function listTrends(industry?: string, skill?: string) {
  const file = getTrends();
  const skills = getSkills();
  const occs = getOccupations();
  const industries = Array.from(new Set(file.items.flatMap((t) => t.industries))).sort();
  let items = file.items;
  if (industry) items = items.filter((t) => t.industries.some((i) => i.toLowerCase() === industry.toLowerCase()));
  if (skill) {
    const q = skill.toLowerCase();
    items = items.filter((t) =>
      t.skills.some((id) => id.toLowerCase() === q || skillName(skills, id).toLowerCase().includes(q)),
    );
  }
  items = [...items].sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
  return { lastUpdated: file.lastUpdated, industries, items: items.map((t) => mapTrend(t, skills, occs)) };
}

export async function profileSummary(profile: ProfileInput) {
  const { analysis, results, mode, modeLabel } = await matchCareers(profile);
  const { skills, evidence, threshold } = analysis;
  const occs = getOccupations();

  const stated = [...profile.technicalSkills, ...profile.humanSkills].map((s) => s.trim()).filter(Boolean);

  const inferred = skills
    .map((s) => ({ s, ev: evidence.get(s.id)! }))
    .filter(({ ev }) => ev.inferredSim >= threshold && ev.statedSim < threshold)
    .sort((a, b) => b.ev.inferredSim - a.ev.inferredSim)
    .slice(0, 6)
    .map(({ s, ev }) => ({ skillId: s.id, name: s.name, evidence: ev.inferredEvidence ?? "" }));

  const exp = profile.experiences ?? [];
  const parts: string[] = [];
  parts.push(
    `${profile.name?.trim() || "This learner"} is a ${profile.status.toLowerCase()} with ${
      profile.educationLevel ? `a ${profile.educationLevel}` : "an education background"
    } in ${profile.major || "an unspecified field"}${profile.institution ? ` at ${profile.institution}` : ""}.`,
  );
  if (exp.length > 0) {
    const first = exp[0]!;
    parts.push(
      `They have ${exp.length} experience ${exp.length === 1 ? "entry" : "entries"}, including ${first.title}${
        first.org ? ` at ${first.org}` : ""
      }.`,
    );
  }
  if (stated.length > 0) {
    parts.push(
      `They list ${profile.technicalSkills.length} technical and ${profile.humanSkills.length} transferable skills, including ${stated
        .slice(0, 4)
        .join(", ")}.`,
    );
  }
  if (profile.interests?.trim()) parts.push(`Their stated interests: ${profile.interests.trim()}.`);
  if (profile.goals?.trim()) parts.push(`Their stated goal: ${profile.goals.trim()}`);

  const top3 = results.slice(0, 3);
  const directions = top3.map((r) => `${r.occupation.title} (${r.occupation.industry})`);

  const devMap = new Map<string, number>();
  for (const r of results.slice(0, 2)) {
    for (const m of r.missingSkills) devMap.set(m.name, Math.max(devMap.get(m.name) ?? 0, m.importance));
  }
  const developmentAreas = [...devMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n]) => n);

  const userSkillIds = new Set(
    skills.filter((s) => (evidence.get(s.id)?.sim ?? 0) >= threshold).map((s) => s.id),
  );
  const topIds = new Set(top3.map((r) => r.occupation.id));
  const topIndustries = new Set(top3.map((r) => r.occupation.industry));
  const trendFile = getTrends();
  const scored = trendFile.items
    .map((t) => {
      let score = 0;
      for (const sk of t.skills) if (userSkillIds.has(sk)) score += 2;
      for (const o of t.occupations) if (topIds.has(o)) score += 3;
      if (t.industries.some((i) => topIndustries.has(i))) score += 1;
      if (t.industries.includes("Cross-industry")) score += 0.5;
      return { t, score };
    })
    .sort((a, b) => b.score - a.score || b.t.publishedDate.localeCompare(a.t.publishedDate));
  const marketInsights = scored.slice(0, 5).map(({ t }) => mapTrend(t, skills, occs));

  return {
    overview: parts.join(" "),
    statedSkills: stated,
    inferredStrengths: inferred,
    directions,
    developmentAreas,
    marketInsights,
    disclaimer:
      "This reflects information you submitted plus labelled system inferences. It is not a psychological or competence assessment.",
    mode,
    modeLabel,
  };
}

export async function similaritySearch(text: string) {
  const scored = await scoreTexts([text]);
  const skills = getSkills();
  const row = scored.matrix[0] ?? [];
  const results = skills
    .map((s, j) => ({ skillId: s.id, name: s.name, similarity: Math.round((row[j] ?? 0) * 1000) / 1000 }))
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 6);
  return { mode: scored.mode, modeLabel: scored.modeLabel, results };
}

export function buildScenarioSet(occupationId: string) {
  const occ = getOccupations().find((o) => o.id === occupationId);
  const file = getScenarios();
  const sc = file.occupations[occupationId];
  if (!occ || !sc) return null;
  const skills = getSkills();
  const trend = (from: number, to: number): "rise" | "hold" | "decline" =>
    to - from >= 8 ? "rise" : to - from <= -8 ? "decline" : "hold";
  return {
    occupationId: occ.id,
    occupationTitle: occ.title,
    gradual: { label: file.global.gradual.label, assumptions: file.global.gradual.assumptions, actions: sc.actions.gradual },
    rapid: { label: file.global.rapid.label, assumptions: file.global.rapid.assumptions, actions: sc.actions.rapid },
    skills: Object.entries(sc.skills).map(([id, [baseline, gradual, rapid]]) => ({
      skillId: id,
      name: skillName(skills, id),
      baseline,
      gradual,
      rapid,
      gradualTrend: trend(baseline, gradual),
      rapidTrend: trend(baseline, rapid),
    })),
    disclaimer: file.disclaimer,
  };
}

const ADVANCED = new Set([
  "deep-learning",
  "machine-learning",
  "generative-ai",
  "devops",
  "cloud-computing",
  "data-storytelling",
  "stakeholder-management",
  "leadership",
  "ethics",
  "ai-literacy",
]);

export async function buildRoadmap(occupationId: string, profile: ProfileInput) {
  const occ = getOccupations().find((o) => o.id === occupationId);
  if (!occ) return null;
  const analysis = await analyseProfile(profile);
  const { skills, evidence, threshold } = analysis;
  const courses = getCourses();

  const covered: string[] = [];
  let gaps: { skillId: string; importance: number; strengthen: boolean }[] = [];
  for (const req of occ.requiredSkills) {
    const sim = evidence.get(req.skillId)?.sim ?? 0;
    if (sim >= threshold) covered.push(skillName(skills, req.skillId));
    else gaps.push({ skillId: req.skillId, importance: req.importance, strengthen: false });
  }
  if (gaps.length < 3) {
    const extra = occ.requiredSkills
      .filter((r) => !gaps.some((g) => g.skillId === r.skillId))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3 - gaps.length)
      .map((r) => ({ skillId: r.skillId, importance: r.importance, strengthen: true }));
    gaps = [...gaps, ...extra];
  }
  gaps.sort((a, b) => {
    const adv = Number(ADVANCED.has(a.skillId)) - Number(ADVANCED.has(b.skillId));
    return adv || b.importance - a.importance;
  });

  const steps = gaps.map((g, idx) => {
    const name = skillName(skills, g.skillId);
    const course = courses[g.skillId];
    const resources = course
      ? course.resources.map((r) => ({
          title: r.title,
          provider: r.provider,
          url: r.url,
          isSearchLink: r.url.includes("search?"),
        }))
      : [
          {
            title: `Search: ${name} courses`,
            provider: "Coursera",
            url: `https://www.coursera.org/search?query=${encodeURIComponent(name)}`,
            isSearchLink: true,
          },
        ];
    return {
      order: idx + 1,
      skillId: g.skillId,
      skill: name,
      why: g.strengthen
        ? `${name} is already visible in your profile; deepening it is a core expectation for ${occ.title} roles (importance ${g.importance}/5).`
        : `${name} is a core requirement for ${occ.title} roles (importance ${g.importance}/5) and your profile shows limited evidence of it so far.`,
      activity: course?.activity ?? `Complete an introductory course in ${name} and apply it in one small practice project.`,
      duration: course?.duration ?? "2-4 weeks",
      durationBasis: course?.durationBasis ?? ("estimated" as const),
      resources,
    };
  });

  return { occupationId: occ.id, occupationTitle: occ.title, steps, alreadyCovered: covered };
}

export function buildImpact(occupationId: string | null, completedSkillIds: string[]) {
  const sdgData = getSdgData();
  const skills = getSkills();
  const occ = occupationId ? getOccupations().find((o) => o.id === occupationId) : undefined;

  const nodes: {
    id: string;
    kind: "career" | "skill" | "sdg";
    label: string;
    sdgNumber: number | null;
    completed: boolean | null;
  }[] = [];
  const links: {
    source: string;
    target: string;
    level: "occupation" | "skill";
    justification: string;
  }[] = [];
  const sdgSeen = new Set<number>();
  const addSdg = (n: number) => {
    if (sdgSeen.has(n)) return;
    sdgSeen.add(n);
    const s = sdgData.sdgs.find((x) => x.number === n);
    nodes.push({ id: `sdg:${n}`, kind: "sdg", label: `SDG ${n}: ${s?.name ?? ""}`, sdgNumber: n, completed: null });
  };

  const occupationSdgs: number[] = [];
  if (occ) {
    nodes.push({ id: `career:${occ.id}`, kind: "career", label: occ.title, sdgNumber: null, completed: null });
    for (const m of sdgData.occupations[occ.id] ?? []) {
      occupationSdgs.push(m.sdg);
      addSdg(m.sdg);
      links.push({ source: `career:${occ.id}`, target: `sdg:${m.sdg}`, level: "occupation", justification: m.justification });
    }
  }

  const userSdgs = new Set<number>();
  const uniqueCompleted = Array.from(new Set(completedSkillIds));
  for (const id of uniqueCompleted) {
    const sk = skills.find((s) => s.id === id);
    const maps = sdgData.skills[id] ?? [];
    if (!sk || maps.length === 0) continue;
    nodes.push({ id: `skill:${id}`, kind: "skill", label: sk.name, sdgNumber: null, completed: true });
    if (occ?.requiredSkills.some((r) => r.skillId === id)) {
      links.push({
        source: `career:${occ.id}`,
        target: `skill:${id}`,
        level: "occupation",
        justification: `${sk.name} is a required skill for ${occ.title} roles.`,
      });
    }
    for (const m of maps) {
      userSdgs.add(m.sdg);
      addSdg(m.sdg);
      links.push({ source: `skill:${id}`, target: `sdg:${m.sdg}`, level: "skill", justification: m.justification });
    }
  }

  return {
    nodes,
    links,
    userSdgs: [...userSdgs].sort((a, b) => a - b),
    occupationSdgs: [...new Set(occupationSdgs)].sort((a, b) => a - b),
    disclaimer: "Potential contributions, not measured impact.",
  };
}
