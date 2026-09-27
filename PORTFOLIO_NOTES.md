# Portfolio Notes: ApplyAgent

Talking points for interviews. The implementation was written by an AI coding assistant under my direction (see [BUILD_NOTES.md](BUILD_NOTES.md)). Describe it that way.

## 30-second explanation

> "ApplyAgent compares a resume with a job description using five separate AI stages instead of one big prompt. One agent extracts the job's requirements; a second matches each one to exact quotes from the resume; the score comes from a transparent formula in code; a fourth agent suggests honest rewrites; and a fifth acts as an independent critic that rejects anything fabricated or exaggerated. Code checks sit between the stages. For example, a resume quote the model invents is detected and the match downgraded. I defined the requirements, designed the five-stage architecture and specified each agent's behavior, then orchestrated an AI coding assistant to build it. I directed an adversarial evaluation that found real failures, and had them fixed and re-tested."

## System architecture

- **Next.js App Router** app with one API route, `POST /api/analyze`, which streams NDJSON progress events.
- **Orchestrator** (`lib/agents/orchestrator.ts`) runs the stages in dependency order, applies deterministic guardrails between them, and emits a stage event at every transition.
- **Agents** (`lib/agents/*Agent.ts`) each have their own system prompt, minimal context and Zod output schema.
- **Stage 5** (`lib/agents/validationStage.ts`) merges deterministic pre-checks with the AI critic's verdicts. Approval requires both.
- **Structured-output call** (`lib/anthropic.ts`): one Claude call per agent. Structured outputs enforce the schema, Zod checks it again, and a malformed response is retried once.
- **Guardrails** (`lib/validation.ts`, `lib/scoring.ts`) are plain TypeScript: quote verification, keyword matching, fabrication pre-checks, and the scoring formula.
- **Client** (`hooks/useAnalysis.ts`) reads the stream and drives the stage tracker, then the results view.
- **Resume upload** (`app/api/extract`, `lib/documentText.ts`): PDF/.docx → plain text on the server with open-source parsers (no AI call). The text is placed in the editable resume box, so the user reviews exactly what gets analyzed, and evidence quotes are verified against that same text.
- The API key stays on the server. SDK modules import `server-only`, and the production client bundle was checked for key and SDK references.

## The five stages

1. **Requirement Extraction.** Reads only the job description. Produces structured lists plus 8–15 key requirements, each with an id, category and importance.
2. **Evidence Matching.** Reads the requirements and the resume. Labels each requirement strong, partial, transferable or none, with verbatim quotes. Calibration rules keep similar technologies at "transferable" at most. Code then removes any quote not found in the resume.
3. **Scoring.** The numbers are computed in code first. The agent explains them, ranks the gaps and picks the strongest and partial matches, but cannot change the numbers.
4. **Recommendations.** Rewrites existing resume lines as Original → Suggested → Reason. Requirements the resume can't support go into "not addressable by rewording".
5. **Validation.** An independent critic that sees only the resume and the suggestions. Code pre-checks hard-reject a missing original, new numbers, and new leadership/ownership verbs.

## Why the stages were separated

- **Less context, less contamination.** An agent that sees only the job description can't bend requirements toward the resume. A validator that never sees the job can't approve a stretch because "the employer wants it".
- **Checks between steps.** Separate stages create places to verify output in code before it moves on.
- **Debuggability.** Each stage's output can be inspected in the Agent Insights panel, including which layer rejected each recommendation.
- **Independent tuning.** Each stage has its own prompt and effort level (medium for extraction and scoring, high for evidence, recommendations and validation).
- **Safe parallelism.** The explicit dependency graph lets Scoring and Recommendations run at the same time.

## Validation strategy (defence in depth)

1. **Schema:** structured outputs plus Zod. Malformed output is retried once, then fails cleanly.
2. **Evidence:** every quote must appear in the resume (normalising case, whitespace and quote marks). A match left without a quote is downgraded to "no evidence".
3. **Scoring:** a deterministic formula, so the model can't inflate the score.
4. **Pre-checks:** the original must exist in the resume; no new numbers; no leadership/ownership verbs the resume never uses.
5. **Critic agent:** checks for unsupported skills or technologies, invented experience, fabricated metrics, exaggerated responsibility, misleading wording and contradictions. Rejects when in doubt.
6. **Presentation:** only approved edits are shown prominently. Rejected ones are collapsed, struck through, and show the reason.

## Evaluation results (what can be said honestly)

- 7 hallucination-trap cases (AWS, Python, years, Kubernetes/Docker, MongoDB, leadership, certification) × 5 runs: 35 of 35 runs completed all five stages, and every trap requirement was reported as a gap.
- Validation rejected **255 of 255** injected fabrications and approved **93 of 93** clean honest controls.
- Run 1 exposed real failures: evidence overstatement (AWS, mentoring, years), and "Designed" → "**Owned**" reaching the final output. After prompt changes and a new deterministic pre-check, no clear fabrication reached approved output in runs 2–5.
- Remaining gray area: describing Redis as a "NoSQL key-value store" is true but slips in the job's keyword, and the validator is inconsistent about it.
- Performance: 87.7 s average (65.6–100.0 s) over 5 realistic pairs run one at a time, with 0 errors.
- Caveat: the test cases were written by the same AI that built the system, and fixes were tuned on them. These are regression results, not real-world error rates.

## Limitations

- File upload handles PDF and .docx only: no OCR for scanned PDFs, no legacy .doc, and multi-column layouts may extract out of order (the user reviews the text before analysis).
- Exact keyword matching (no synonyms or stemming).
- Strict quote verification: a loose paraphrase of a real line is downgraded (a deliberate false negative).
- Word-based pre-checks can reject honest phrasings ("five" vs "5", "lead generation").
- Model output varies between runs, and gray-area descriptors aren't handled consistently.
- The scoring weights are reasoned heuristics, not calibrated against hiring outcomes.
- Five model calls per analysis: 65–100 s, and more expensive than a single prompt.
- The public endpoint has no rate limiting of its own.

## Potential improvements

- A larger, independently written evaluation set, with a human reviewer instead of the building AI.
- A consistent rule for true-but-keyword-steering descriptors.
- Fuzzy quote matching with a similarity threshold.
- Synonym-aware keyword matching ("JS" ↔ "JavaScript").
- Prompt caching for the resume, which is sent to three agents.
- Per-IP rate limiting before sharing the deployment widely.
- OCR for scanned PDFs.

## Likely interview questions and concise answers

**Q: Why not one prompt?**
A: One prompt gives you nowhere to verify anything in between, and every step sees everything, including the job description, which pushes the model toward "matching". Separate stages limit context, allow code checks between steps, and make an independent critic possible.

**Q: How do you stop it inventing experience?**
A: Layers. The prompts forbid it. Evidence quotes are verified against the resume in code. Deterministic pre-checks reject new numbers and new leadership verbs. And a critic agent with no access to the job description must approve every edit.

**Q: Did that actually work?**
A: Mostly, and the testing showed where it didn't. In the first adversarial run, "Designed" became "Owned" and was approved. We added an ownership-verb pre-check and tightened the prompts, and it didn't recur in four more runs. All 255 injected fabrications were rejected. The honest caveat: the test cases aren't independent, so I present these as regression results.

**Q: Why compute the score in code?**
A: Models are inconsistent at producing numbers, and a model-generated number can't be explained. A fixed formula gives the same score for the same evidence, traceable to labelled requirements.

**Q: What runs in parallel?**
A: Scoring and Recommendations, because both depend only on stages 1–2. Validation waits for Recommendations. If one parallel branch fails, the other is aborted and shown as cancelled.

**Q: How are malformed model responses handled?**
A: Structured outputs constrain the format, and Zod checks it again. A failed parse is retried once, then the stage is marked failed and the user sees a clear message.

**Q: How is the API key protected?**
A: It's read only in modules marked `server-only`, the browser only calls our own route, and the production client bundle was checked for key and SDK references.

**Q: Why extract file text into the text box instead of sending the PDF straight to the model?**
A: Three reasons. It costs no API credits. The user sees and can fix exactly what will be analyzed, since extraction can garble multi-column layouts. And the anti-hallucination guarantee depends on it: evidence quotes are verified against the exact text the user approved.

**Q: What was your role, given the code is AI-written?**
A: I defined the requirements, designed the five-stage architecture, specified each agent's behavior, and orchestrated the AI-assisted development. I reviewed the results, directed the testing, evaluated the failures and refined the prompts, and I manage the deployment. I can explain every design decision and its trade-offs, including which ones the assistant proposed.

## What I orchestrated vs. what AI implemented

| Me | AI coding assistant |
|---|---|
| Defined requirements, scope and non-goals | Scaffolded the project and installed dependencies |
| Designed the five-stage architecture | Implemented the agents, orchestrator, schemas and guardrails |
| Specified each agent's behavior and prohibitions | Drafted the system prompts to that specification |
| Orchestrated development and reviewed results | Built the UI, error handling and server/client boundaries |
| Directed testing and defined the trap scenarios | Wrote the detailed test cases, unit tests and evaluation harness, and ran them |
| Evaluated failures and refined prompts | Diagnosed defects, implemented fixes, re-ran the evaluations |
| Manage deployment | Drafted the documentation |
