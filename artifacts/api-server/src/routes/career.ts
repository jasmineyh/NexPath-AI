import { Router, type IRouter } from "express";
import { analyseCv, cvMode } from "../lib/cv";
import {
  AnalyseCvBody,
  AnalyseCvResponse,
  GetCvModeResponse,
  BuildImpactBody,
  BuildImpactResponse,
  BuildRoadmapBody,
  BuildRoadmapResponse,
  GetProfileSummaryBody,
  GetProfileSummaryResponse,
  GetScenariosParams,
  GetScenariosResponse,
  ListOccupationsResponse,
  ListSdgsResponse,
  ListSkillsResponse,
  ListTrendsQueryParams,
  ListTrendsResponse,
  MatchCareersBody,
  MatchCareersResponse,
} from "@workspace/api-zod";
import { getOccupations, getSdgData, getSkills } from "../lib/data";
import {
  buildImpact,
  buildRoadmap,
  buildScenarioSet,
  listTrends,
  matchCareers,
  profileSummary,
  toOccupationDto,
  type ProfileInput,
} from "../lib/engine";

const router: IRouter = Router();

router.get("/skills", (_req, res) => {
  res.json(ListSkillsResponse.parse(getSkills().map((s) => ({ id: s.id, name: s.name, category: s.category, synonyms: s.synonyms }))));
});

router.get("/occupations", (_req, res) => {
  const skills = getSkills();
  res.json(ListOccupationsResponse.parse(getOccupations().map((o) => toOccupationDto(o, skills))));
});

router.get("/sdgs", (_req, res) => {
  res.json(ListSdgsResponse.parse(getSdgData().sdgs));
});

router.get("/trends", (req, res) => {
  const q = ListTrendsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  res.json(ListTrendsResponse.parse(listTrends(q.data.industry, q.data.skill)));
});

router.get("/scenarios/:occupationId", (req, res) => {
  const p = GetScenariosParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: "Invalid occupation id" });
    return;
  }
  const set = buildScenarioSet(p.data.occupationId);
  if (!set) {
    res.status(404).json({ error: "Unknown occupation" });
    return;
  }
  res.json(GetScenariosResponse.parse(set));
});

router.post("/profile/summary", async (req, res) => {
  const body = GetProfileSummaryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid profile" });
    return;
  }
  const summary = await profileSummary(body.data as ProfileInput);
  res.json(GetProfileSummaryResponse.parse(summary));
});

router.get("/cv/mode", (_req, res) => {
  res.json(GetCvModeResponse.parse(cvMode()));
});

// The CV content is processed in memory only: never stored and never logged.
router.post("/cv/analyse", async (req, res) => {
  const body = AnalyseCvBody.safeParse(req.body);
  if (!body.success || (!body.data.text && !(body.data.items && body.data.items.length))) {
    res.status(400).json({ error: "CV text or layout items are required" });
    return;
  }
  const d = body.data;
  res.json(
    AnalyseCvResponse.parse(
      await analyseCv({ text: d.text, items: d.items, pages: d.pages, useAi: d.useAi, debug: d.debug }),
    ),
  );
});

router.post("/match", async (req, res) => {
  const body = MatchCareersBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid profile" });
    return;
  }
  const { mode, modeLabel, results } = await matchCareers(body.data as ProfileInput);
  res.json(MatchCareersResponse.parse({ mode, modeLabel, results }));
});

router.post("/roadmap", async (req, res) => {
  const body = BuildRoadmapBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const roadmap = await buildRoadmap(body.data.occupationId, body.data.profile as ProfileInput);
  if (!roadmap) {
    res.status(404).json({ error: "Unknown occupation" });
    return;
  }
  res.json(BuildRoadmapResponse.parse(roadmap));
});

router.post("/impact", (req, res) => {
  const body = BuildImpactBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  res.json(BuildImpactResponse.parse(buildImpact(body.data.occupationId, body.data.completedSkillIds)));
});

export default router;
