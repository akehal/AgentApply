# ApplyAgent: Multi-Agent AI Resume Analysis

ApplyAgent checks how well a resume fits a specific job description. It runs **five separate AI stages**, each with one job: extract the job's requirements, match them to quoted resume evidence, score the fit, recommend honest edits, and independently audit those edits for fabrication.

**Live demo:** https://agent-apply-three.vercel.app/ (click **Load Demo** for fictional sample data)

> Scores are **AI-generated alignment estimates**. They are not an employer's ATS score and do not predict hiring outcomes.

This project was built with an AI-assisted development workflow; see [BUILD_NOTES.md](BUILD_NOTES.md) for who did what.

---

## Purpose

Many resume "optimizers" send one large prompt and get back a confident number plus rewrites that invent skills or metrics. ApplyAgent demonstrates a more trustworthy pattern:

- every conclusion is tied to **verbatim resume evidence**, and code checks that each quote really exists;
- scores come from a **transparent formula in code**, not a number the model makes up;
- a **separate critic agent**, backed by deterministic checks, reviews every suggested edit. Only approved edits are shown prominently.

## Results at a glance

Measured against the live Claude API with fictional data. Full methodology and caveats are in [METRICS.md](METRICS.md) and [VALIDATION_TESTS.md](VALIDATION_TESTS.md).

| Measure | Result |
|---|---|
| Analysis duration (5 realistic pairs, run one at a time) | 87.7 s average, 65.6–100.0 s range, 0 errors |
| Adversarial runs (7 hallucination-trap cases × 5 runs) | 35 of 35 completed all five stages |
| Injected fabricated recommendations rejected by validation | 255 of 255 |
| Honest control rewrites approved | 93 of 93 (excluding one flawed control, documented) |
| Clear unsupported suggestion that reached final output | 1 (before fixes); 0 after |

These are author-built test cases, and the fixes were tuned on them. They show regression behaviour, not real-world error rates.

## Features

- Paste a resume and a job description as plain text, or load fictional demo data
- Upload a resume as **PDF or Word (.docx)**, by drag-and-drop or file picker. The text is extracted on the server (no AI call, nothing stored) and filled into the resume box for review and editing before analysis
- Live progress for the five stages (waiting / processing / complete / failed), streamed from the server as each stage actually finishes, with an elapsed-time counter
- Overall match score with a per-dimension breakdown (Technical Skills, Experience, Keyword Alignment, Education), each explained
- Strongest matches, partial matches, and skill/requirement gaps ranked critical / moderate / minor
- ATS keyword analysis: exact terms found vs. missing
- Recommendations shown as **Original → Suggested → Why → Validation status**, plus requirements that rewording cannot honestly address
- Validation report with approved/rejected counts, a reason for every rejection, and a confidence level
- Expandable Agent Insights: each stage's structured output, timings, and which layer (AI critic or code pre-check) decided each recommendation
- Clear handling of empty or oversized inputs, auth/configuration errors, rate limits, exhausted credits, malformed model output, network failures and refusals

## Architecture

```
app/
  page.tsx                    Page shell (server component)
  api/analyze/route.ts        Thin POST handler: validate input → stream NDJSON events
  api/extract/route.ts        PDF/.docx upload → plain text (no AI call)
components/
  AnalyzerApp.tsx             Client state machine: idle → running → done | error
  IntroHero.tsx               Product intro (input screen only)
  input/                      Resume + job description form, resume file drop zone
  progress/StageTracker.tsx   Live five-stage status with elapsed time
  results/                    Score, matches, keywords, recommendations, validation, insights
  ui/                         Card, Badge, Button primitives; display labels
hooks/
  useAnalysis.ts              fetch + NDJSON stream reader
  useResumeUpload.ts          Resume file upload → extracted text
lib/
  agents/
    requirementsAgent.ts      Stage 1: Requirement Extraction
    evidenceAgent.ts          Stage 2: Resume Evidence Matching
    scoringAgent.ts           Stage 3: Scoring (explains code-computed scores)
    recommendationAgent.ts    Stage 4: Recommendations
    validationAgent.ts        Stage 5: AI critic prompt
    validationStage.ts        Stage 5: pre-checks + critic, merged conservatively
    orchestrator.ts           Stage order, concurrency, guardrails between stages, progress events
  anthropic.ts                Server-only Claude client + structured-output call with retry
  schemas.ts                  Zod schema for every agent output (single source of truth)
  validation.ts               Deterministic guardrails: input limits, quote verification, keywords, pre-checks
  scoring.ts                  Deterministic, explainable score formula
  documentText.ts             PDF (unpdf/PDF.js) and .docx (mammoth) text extraction
  errors.ts, errorMapping.ts  User-safe errors; SDK error → user message mapping
  constants.ts, demoData.ts
types/analysis.ts             Shared types (inferred from schemas) and the streaming protocol
tests/                        Unit tests (Vitest), with Claude mocked
evals/                        Live adversarial and performance evaluation harness + raw results
```

**Server/client split.** Every module that touches the Anthropic SDK or `ANTHROPIC_API_KEY` imports `server-only`, so the build fails if one is pulled into client code. The browser only talks to `/api/analyze`.

**Streaming progress.** The API route returns `application/x-ndjson`. The orchestrator emits a `stage` event when a stage starts, completes or fails, then a final `result` or `error` event. The UI shows data only after it arrives. Nothing is simulated.

## Five-stage workflow

```
1. Requirements ──► 2. Evidence ──┬──► 3. Scoring
                                  └──► 4. Recommendations ──► 5. Validation
```

| # | Stage | Receives | Returns | Guardrails applied after |
|---|-------|----------|---------|--------------------------|
| 1 | **Requirement Extraction** | Job description only | Title, company, required/preferred skills, technologies, responsibilities, experience, education, ATS keywords, soft skills, 8–15 key requirements (id, category, importance) | Unique ids; at least one requirement |
| 2 | **Evidence Matching** | Key requirements + resume | Per requirement: `strong` / `partial` / `transferable` / `none`, verbatim quotes, rationale | **Quote verification**: quotes not found in the resume are dropped, and a match left with no quote is downgraded to `none`. Skipped requirements default to `none` |
| 3 | **Scoring** | Verified assessments, computed scores, keyword analysis (no raw resume or job description) | Strongest/partial matches, prioritised gaps, per-dimension rationale, summary | Scores are computed **in code** before this stage; the agent explains them but cannot change them. Unknown requirement ids are dropped |
| 4 | **Recommendations** | Resume + verified assessments + missing keywords (not the job posting) | Original / Suggested / Reason edits, plus gaps rewording cannot honestly fix | Unique ids |
| 5 | **Validation** | Resume + recommendations + pre-check flags (no job description, so the employer's wishes cannot sway it) | Approve or reject each edit, with issue types, a reason, a summary and confidence | **Hard rejection** if the original text is not in the resume, the suggestion adds a number found nowhere in the resume, or it adds a leadership/ownership verb (led, owned, managed, mentored, …) the resume never uses. A missing verdict counts as a rejection |

Stages 3 and 4 depend only on stages 1–2, so they **run in parallel**. If one fails, the other is aborted and marked as cancelled.

Each stage has its own system prompt, receives only the context it needs, and returns JSON that must match its Zod schema. The schema is enforced by Claude's structured outputs and checked again with Zod before the next stage uses the result. A malformed response is retried once, then reported as a clear error.

### How scoring works

```
match credit:     strong 100% · partial 60% · transferable 35% · none 0%
importance:       required ×2 · preferred ×1
dimension score = Σ(importance × credit) / Σ(importance)     (per requirement category)
keywords score  = ATS keywords found verbatim / total keywords
overall         = Technical 40% · Experience 35% · Keywords 15% · Education 10%
                  (weights re-normalised when a dimension has no requirements)
```

The same verified evidence always produces the same score, and the UI shows the formula and the basis for each dimension.

## Responsible AI approach

- **No fabrication by design.** Prompts forbid inventing skills, technologies, jobs, responsibilities, certifications, achievements, metrics, projects or education. When the resume doesn't support a requirement, the app says so under "Not addressable by rewording".
- **Defence in depth.** Prompts alone are not trusted. Code verifies evidence quotes, and deterministic pre-checks hard-reject new numbers and new leadership verbs. An independent critic must approve every edit before it is shown prominently. Rejected edits stay visible but collapsed, struck through, and labelled with the reason.
- **Tested adversarially.** Hallucination-trap cases and injected fabrications are run against the live pipeline; see [VALIDATION_TESTS.md](VALIDATION_TESTS.md), including what failed.
- **Honest framing.** The UI states that the score is an AI estimate, not an ATS result.
- **Privacy.** Nothing is stored and there is no database. Uploaded files are parsed in memory and discarded; only the extracted text is sent on, and only when the user clicks Analyze. The UI warns that inputs are sent to the AI provider. Server logs record error codes and messages only, never resume text.
- **Safe errors.** Users see friendly messages. Stack traces, provider error bodies and secrets never reach the client.
- **Refusal handling.** On `claude-opus-5` the app enables the API's server-side refusal fallbacks (`fallbacks: "default"`), and a final `refusal` stop reason becomes a clear message.

## Technologies

- Next.js 16 (App Router, Route Handlers, Turbopack), React 19, TypeScript
- Tailwind CSS v4
- Anthropic Claude API via the official `@anthropic-ai/sdk`: structured outputs (`betaZodOutputFormat`), adaptive thinking, per-stage effort
- Zod for schemas and runtime validation
- unpdf (PDF.js) and mammoth for resume file text extraction
- Vitest for unit tests; `tsx` for the evaluation scripts
- Vercel for hosting

Default model: `claude-opus-5`. Set `ANTHROPIC_MODEL` to override it.

## Installation

Requires Node.js 20.9 or later.

```bash
npm install
```

## Environment setup

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```
ANTHROPIC_API_KEY=your-key-here
# ANTHROPIC_WORKSPACE_ID=wrkspc_...   (only if the key is not scoped to a workspace)
# ANTHROPIC_MODEL=claude-opus-5       (optional)
```

The file must be named exactly `.env.local` (Windows editors may silently add `.txt`) and use the `NAME=value` format. It is ignored by Git, and the key is read only on the server.

```bash
npm run dev          # http://localhost:3000
npm test             # unit tests (no API calls)
npm run lint
npx tsc --noEmit
npm run build
```

Without a key the UI still loads, but an analysis fails straight away with a message that `ANTHROPIC_API_KEY` is missing.

## Vercel deployment

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository. The framework is detected automatically.
3. Under **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` for Production (and Preview if wanted). Add `ANTHROPIC_WORKSPACE_ID` or `ANTHROPIC_MODEL` only if needed.
4. Deploy, then run the demo once on the live URL.

A full analysis makes five model calls and took 65–100 s in testing. The route sets `maxDuration = 300` seconds, which fits Vercel's default Fluid Compute limits. If your plan's limit is lower, raise it or choose a faster model.

**Cost exposure:** the public endpoint has no authentication or rate limiting of its own, so anyone with the URL can spend your API credits. Set a monthly spend limit in the Anthropic Console, or protect the deployment (for example, Vercel deployment protection) while sharing it.

## Testing and evaluation

- `npm test`: 35 unit tests covering the deterministic guardrails, scoring, error mapping, resume file extraction (against real PDF/.docx fixtures in `tests/fixtures/`), and the orchestrator (stage isolation, merge rules, failure handling), with Claude mocked.
- `npm run eval:adversarial`: runs hallucination-trap cases through the real pipeline and injects known fabrications into validation. Calls the live API (about 56 model calls).
- `npm run eval:metrics`: runs five realistic fictional pairs one at a time and records timing and counts. Calls the live API.

Both eval scripts read `.env.local`. Raw results are in `evals/results/`.

## Limitations

- Resume upload supports PDF and .docx only (not legacy .doc). Scanned/image-only PDFs have no extractable text (no OCR), and multi-column layouts can come out in a jumbled order, which is why the extracted text is shown for review. Uploads are capped at 4 MB (Vercel's request limit is 4.5 MB). The job description is paste-only.
- Keyword matching is exact-term only (no synonyms or stemming).
- Quote verification tolerates formatting differences but not paraphrase, so a genuine match quoted loosely by the model can be downgraded. This is deliberately conservative.
- The numeric pre-check can reject a truthful edit that writes a number differently ("five" vs "5"). The leadership-verb pre-check is word-based and can reject an honest phrase such as "lead generation".
- The validator is inconsistent on true-but-keyword-steering descriptors (e.g. describing Redis as "NoSQL"), and model output varies between runs.
- Scores are heuristic and not calibrated against real hiring data.
