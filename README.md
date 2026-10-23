# NexPath AI — Navigate What's Next.

AI-powered career navigation and reskilling prototype for Malaysian university students, fresh graduates and early-career professionals. Built for the SDC Hackathon 2026 (Future-Ready Workforce). Primary SDG 8; supporting SDGs 4, 9 and 10.

## Team

| | |
|---|---|
| **Team name** | `No Idea` |
| **Domain / track** | Future-Ready Workforce |
| **Members** | `Chia Jin Yi`, `Gan Yu Xuan`, `Jasmine Chin Ying Hui`, `Tan Xiao Shih`, `Then Pei Joo` |

## Links

| | |
|---|---|
| **Live app (Replit)** | https://replit.com/t/no-idea-nexpath-ai/repls/NexPath-AI |
| **Demo video** | `TODO: ` |
| **Pitch video** | `TODO:` |

## Submission files

All required documents are in [`submission/`](./submission):

- `SDC2026_TeamName_Preliminary.pdf` — completed submission template
- `Replit Proof of Use.pdf` — deployment and AI credits screenshots
- `RunPod Proof of Use.pdf` — running pod and GPU usage screenshots

## Stack

- Frontend: React + Vite + Tailwind (`artifacts/nexpath`), wouter routing, React Query. Profile, chosen career, roadmap progress and resume edits persist in `localStorage`.
- Backend: Node + Express 5 + TypeScript (`artifacts/api-server`), contract-first OpenAPI (`lib/api-spec/openapi.yaml`) with generated Zod schemas and React Query hooks.
- Embedding service: RunPod worker (`runpod-worker/`) serving `sentence-transformers/all-MiniLM-L6-v2`.
- No database is required: all reference data is in editable JSON files.

## How to run

**On Replit (recommended):** open the Replit project and press Run. Both services start as workflows:

- `artifacts/api-server: API Server`
- `artifacts/nexpath: web`

**Locally:**

```bash
pnpm install
# TODO: add the dev commands for api-server and nexpath (see each package.json)
```

To change the API contract, edit `lib/api-spec/openapi.yaml` and run:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Environment variables

| Variable            | Purpose                                                                                                                     |
|---------------------|-----------------------------------------------------------------------------------------------------------------------------|
| `EMBEDDING_API_URL` | HTTP endpoint of the embedding service (e.g. a RunPod endpoint running `sentence-transformers/all-MiniLM-L6-v2`). Optional. |
| `EMBEDDING_API_KEY` | Bearer token for that endpoint. Optional.                                                                                   |
| `NEXPATH_DATA_DIR`  | Optional override for the data directory (default `artifacts/api-server/data`).                                             |

If either embedding variable is missing, or the call fails or times out (8 s), matching silently falls back to the rule-based matcher and the UI badge shows "Matching mode: Rule-based fallback".

### Embedding endpoint contract

```
POST $EMBEDDING_API_URL
Authorization: Bearer $EMBEDDING_API_KEY
{ "texts": ["creating charts and reports", "..."] }

200 OK
{ "vectors": [[0.01, ...], [0.02, ...]] }      // "embeddings" is also accepted
```

Cosine similarity is computed in the backend (`src/lib/matcher/embedding.ts`). Skill catalogue vectors are cached in memory after the first call. After a failure the backend stays on the rule-based matcher for 30 seconds before retrying.

## Matching engine

`SkillMatcher` interface (`artifacts/api-server/src/lib/matcher`) with two implementations:

1. `deterministic` — normalised keyword, synonym and token-overlap matching. Always runs.
2. `embedding` — semantic similarity from the external endpoint. When active, its scores are blended with the deterministic scores by taking the higher value per skill, so exact keyword hits are never lost.

Career score = 45% weighted required-skill coverage + 35% weighted similarity + 20% interest alignment (interest keywords and related majors). Every result returns matched skills, missing skills and plain-language reasons. The score is a prototype suitability indicator, not a prediction.

`GET /api/health` reports the active mode and `POST /api/similarity` returns the most similar skills for a phrase; both power the AI status page (`/app/ai-status`).

## Data files (`artifacts/api-server/data`)

Files are re-read on every request, so edits take effect without a rebuild.

| File                | Content                                                                                            |
|---------------------|----------------------------------------------------------------------------------------------------|
| `skills.json`       | Skill catalogue with synonyms                                                                      |
| `occupations.json`  | 11 curated occupations, required skills with importance weights, interest keywords, related majors |
| `courses.json`      | Learning activities and resources per skill                                                        |
| `trends.json`       | Trend cards with source name, URL and publication date, plus the "last updated" date               |
| `scenarios.json`    | Explicit assumptions and skill-priority shifts for the Career Time Machine                         |
| `sdg_mappings.json` | SDG list plus selective occupation-level and skill-level mappings with justifications              |

## Data sources and provenance

- Occupation and skill structure is loosely modelled on ESCO (European Skills, Competences, Qualifications and Occupations) but is a small curated prototype set, not an official ESCO export.
- SDG names and colours follow the UN Sustainable Development Goals (https://sdgs.un.org/goals). Occupation and skill mappings are the authors' selective, illustrative judgements.
- Trend entries cite their original publishers (WEF, LinkedIn Economic Graph, Microsoft/LinkedIn, McKinsey, ILO, IMF, Stack Overflow, ISC2, Nielsen Norman Group, UNESCO, Government of Malaysia MyDIGITAL). Summaries are short paraphrases; verify details at the source before citing.
- Learning resources link to real course pages from Coursera, edX/Harvard CS50, freeCodeCamp, Kaggle Learn, Khan Academy, Microsoft Learn and AWS Skill Builder. Where a specific course was not verified, the link is a provider search page and is labelled as a search link. Durations are marked "provider-stated" or "estimated".
- Career Time Machine scenarios are illustrative planning scenarios based on explicit assumptions in `scenarios.json`, not forecasts.
- All demo data (persona "Alex Tan") is synthetic.

## Responsible AI

Scenarios are illustrative, not predictions. Recommendations are decision support. The prototype does not claim guaranteed outcomes, real-time job availability or verified forecasts. Inferred strengths are labelled as system inferences and are not an assessment of competence.

## License

Apache-2.0. See [LICENSE](./LICENSE).
