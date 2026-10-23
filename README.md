# NexPath AI

**Navigate Your Skills. Discover Your Future.**

An AI-powered career intelligence and skills development platform that helps individuals understand their capabilities, explore evolving industry demands, discover career opportunities, and build personalised learning pathways.

**SDC Hackathon 2026 | Domain 1**

**Team:** No Idea

---

## Project Links

| Resource | Link |
|---|---|
| Live Application | [Launch NexPath AI](INSERT_DEMO_URL) |
| Pitch Video | [Watch Our Pitch](INSERT_PITCH_VIDEO_URL) |
| Pitch Deck | [View Presentation](INSERT_PITCH_DECK_URL) |
| GitHub Repository | [NexPath AI](https://github.com/jasmineyh/NexPath-AI) |

> **Note:** Replace the placeholder URLs with publicly accessible links before submission.

## 1. Project Overview

### The Problem

As industries evolve through technological advancement and digital transformation, students and job seekers face increasing uncertainty about which skills to develop and how to prepare for future career opportunities.

Career guidance resources are often fragmented, making it difficult for individuals to connect their existing capabilities with industry expectations and actionable development plans.

### Our Solution

**NexPath AI** brings career exploration, skills intelligence, and personalised development planning into one interactive platform.

By combining user profile analysis, skills trends, career exploration, and learning recommendations, NexPath AI helps users make more informed decisions about their professional development.

Our goal is to make career readiness more **accessible, personalised, and actionable**.

## 2. Key Features

| Feature | Description |
|---|---|
| **My Profile** | Build a personal skills profile through CV uploading or manual entry, with editable extracted information and a visual Skills DNA overview. |
| **Future Skills Radar** | Explore current skills demand, industry trends, emerging capabilities, and personalised opportunities through interactive data visualisations. |
| **Career Explorer** | Discover potential career pathways, examine relevant skills requirements, and identify areas for improvement. |
| **My Pathway** | Explore personalised upskilling and reskilling recommendations through a structured learning roadmap. |
| **My Career Portfolio** | Present skills, experiences, and relevant contributions through a career portfolio with an interactive Sustainable Development Goals (SDG) visualisation. |

### User Journey

```text
Create Profile / Upload CV
            |
            v
Understand Existing Skills
            |
            v
Explore Future Skills Trends
            |
            v
Discover Career Opportunities
            |
            v
Identify Skills Gaps
            |
            v
Build a Learning Pathway
            |
            v
Showcase Career Portfolio
```

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React, TypeScript, Vite | Interactive web application |
| Styling | Tailwind CSS | Responsive interface and design system |
| Package Management | pnpm | Monorepo dependency management |
| Backend | Existing NexPath API server | Application logic and data processing |
| CV Processing | PDF.js, Mammoth | Text extraction from PDF and DOCX resumes |
| Data Visualisation | React-based chart components | Skills intelligence, trends, and profile visualisations |
| Development | VS Code, GitHub, Replit | Development, prototyping, and version control |
| AI Infrastructure | RunPod worker infrastructure | Server-side AI inference integration where configured |

The application uses a modular architecture that separates its frontend, backend services, and AI worker components.

## 4. Replit and RunPod Integration

### Replit — Rapid Prototyping and Development

Replit was used as part of our development workflow to accelerate the initial prototyping and implementation of NexPath AI.

Its cloud-based development environment supported rapid iteration of the application's structure, interface, and early functionality.

The project was subsequently refined using VS Code, with GitHub supporting source control and collaboration.

**Replit's role:**
- Rapid application prototyping
- Early frontend and backend development
- Iterative feature implementation
- Streamlined development workflow

### RunPod — AI Processing Infrastructure

NexPath AI includes a dedicated RunPod worker implementation designed to support server-side AI processing.

The worker infrastructure is organised separately from the frontend, enabling AI inference workloads to be integrated through backend services without exposing API credentials in the browser.

**RunPod worker components:**
- `handler.py` — worker request handling
- `Dockerfile` — container configuration
- `requirements.txt` — Python dependencies

The intended architecture is:

```text
NexPath AI Frontend
        |
        v
NexPath Backend API
        |
        v
RunPod Serverless Endpoint
        |
        v
AI Processing Worker
        |
        v
Structured Response
        |
        v
NexPath AI User Interface
```

**Deployment status:** [Confirm whether the RunPod endpoint is deployed and operational, configured but not deployed, or still under development.]

The presence of the worker code does not by itself establish that live RunPod inference is active.

## 5. Project Structure

The repository is organised as a pnpm monorepo.

```text
NexPath-AI/
|
|-- artifacts/
|   |-- nexpath/
|   |   |-- src/
|   |   |   |-- components/     # Reusable UI components
|   |   |   |-- pages/          # Application pages
|   |   |   |-- lib/            # Utilities and CV extraction
|   |   |-- tests/              # Frontend-related tests
|   |   |-- vite.config.ts
|   |
|   |-- api-server/
|       |-- src/
|           |-- lib/            # Backend logic and data processing
|
|-- runpod-worker/
|   |-- Dockerfile
|   |-- handler.py
|   |-- requirements.txt
|
|-- submission/                 # Hackathon submission materials
|
|-- package.json
|-- pnpm-lock.yaml
|-- pnpm-workspace.yaml
|-- README.md
```

## 6. Getting Started

### Prerequisites

Ensure the following tools are installed:

- Node.js (compatible with the project's package requirements)
- pnpm
- Git
- A modern web browser

### Step 1 — Clone the Repository

```bash
git clone https://github.com/jasmineyh/NexPath-AI.git
cd NexPath-AI
```

### Step 2 — Install Dependencies

```bash
pnpm install
```

### Step 3 — Configure Environment Variables

Configure the environment variables required by the relevant frontend and backend services.

For local frontend development using Windows PowerShell:

```powershell
$env:PORT="5174"
$env:BASE_PATH="/"
```

If using a deployed RunPod endpoint, configure the following securely in the backend environment:

```env
RUNPOD_API_KEY=your_runpod_api_key
RUNPOD_ENDPOINT_ID=your_runpod_endpoint_id
```

Do not commit actual API keys, secrets, or private credentials to GitHub.

### Step 4 — Start the Frontend

From the repository root:

```bash
pnpm --filter @workspace/nexpath dev
```

Open the application at:

**http://localhost:5174/**

If the frontend requires backend services for certain features, those services must also be running and correctly configured.

### Step 5 — Start the Backend

The backend is located under:

```text
artifacts/api-server/
```

Install dependencies using the root workspace installation and start the backend using the development script defined in its package configuration.

Refer to the backend's actual environment requirements before enabling AI-dependent features.

### Step 6 — Run Checks

To verify TypeScript compilation:

```bash
pnpm --filter @workspace/nexpath exec tsc --noEmit
```

To create a production build:

```bash
pnpm --filter @workspace/nexpath build
```

## 7. Suggested Demo Walkthrough

For judges exploring the application, we recommend the following sequence:

1. **Create a profile** — Upload a CV or enter personal details manually.
2. **Explore Skills DNA** — Review existing technical and transferable skills.
3. **Open Future Skills Radar** — Explore interactive industry demand and skills trend visualisations.
4. **Discover career pathways** — Compare potential careers and identify relevant skills gaps.
5. **Build a learning pathway** — Explore recommended upskilling opportunities.
6. **View the career portfolio** — Explore experiences, skills, and relevant SDG contributions.

This walkthrough demonstrates how NexPath AI connects personal skills understanding with career exploration and development planning.

## 8. Sustainable Development Goals

NexPath AI incorporates the United Nations Sustainable Development Goals as a framework for exploring how skills, learning, and professional contributions may relate to broader sustainability outcomes.

The interactive 17-goal visualisation allows users to explore relevant goals through their confirmed skills, experiences, and activities.

The project's broader objectives are particularly relevant to:

- **SDG 4 — Quality Education:** Supporting accessible learning and skills development.
- **SDG 8 — Decent Work and Economic Growth:** Encouraging career readiness, employability, and professional development.
- **SDG 9 — Industry, Innovation and Infrastructure:** Supporting digital skills and technology-driven innovation.

SDG associations in the application should be interpreted as evidence-based relevance indicators rather than independently verified impact measurements.

## 9. Project Status

NexPath AI is a hackathon prototype demonstrating an integrated approach to career intelligence, skills exploration, and personalised development planning.

Some market intelligence visualisations may use curated or illustrative datasets rather than continuously updated labour-market information. Such information should be interpreted according to its displayed source and evidence classification.

AI-dependent functionality may require configured backend services and external inference infrastructure.

---

**NexPath AI — Navigate Your Skills. Discover Your Future.**

Developed for **SDC Hackathon 2026**.

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
