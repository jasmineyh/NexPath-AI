import { Router, type IRouter } from "express";
import { GetAiStatusResponse, HealthCheckResponse, TestSimilarityBody, TestSimilarityResponse } from "@workspace/api-zod";
import { embeddingConfigured, probeMode } from "../lib/matcher";
import { similaritySearch } from "../lib/engine";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", async (_req, res) => {
  const probe = await probeMode();
  res.json(
    GetAiStatusResponse.parse({
      status: "ok",
      mode: probe.mode,
      modeLabel: probe.modeLabel,
      embeddingConfigured: embeddingConfigured(),
      fallbackReason: probe.fallbackReason,
    }),
  );
});

router.post("/similarity", async (req, res) => {
  const parsed = TestSimilarityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  const result = await similaritySearch(parsed.data.text);
  res.json(TestSimilarityResponse.parse(result));
});

export default router;
