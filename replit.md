# NexPath AI

AI-powered career navigation and reskilling web app for Malaysian students and early-career professionals (SDC Hackathon 2026). Landing page at `/`, app workspace at `/app/...`.

## Run & Operate

- Workflows: `artifacts/api-server: API Server`, `artifacts/nexpath: web`
- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- Optional env: `EMBEDDING_API_URL`, `EMBEDDING_API_KEY` (external embedding endpoint; falls back to rule-based matching when absent)

## Stack

- pnpm workspaces, Node.js, TypeScript 5.9
- Frontend: React + Vite + Tailwind (`artifacts/nexpath`)
- API: Express 5 (`artifacts/api-server`), OpenAPI + Orval codegen, Zod
- No database; reference data lives in `artifacts/api-server/data/*.json`

## Where things live

- API contract: `lib/api-spec/openapi.yaml`
- Matching engine: `artifacts/api-server/src/lib/matcher` and `src/lib/engine.ts`
- Data files: `artifacts/api-server/data` (re-read per request)
- See `README.md` for env vars, embedding endpoint contract and data provenance

## Architecture decisions

- User profile, target career and roadmap progress persist client-side in localStorage; the backend is stateless.
- Embedding scores are blended with deterministic scores by max, so keyword hits are never lost.

## Gotchas

- The workflow runs the API from `artifacts/api-server`, so data is resolved from `./data` (override with `NEXPATH_DATA_DIR`).
- Do not claim guaranteed outcomes or forecasts anywhere in the UI (user's trust rules).
