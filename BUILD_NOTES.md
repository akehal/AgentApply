# Build Notes

## How this project was built

ApplyAgent was built with an **AI-assisted development workflow**. The code, configuration, tests, evaluation harness and documentation drafts were written by an AI coding assistant (Claude Code) working from my specification and direction. I did not write the implementation by hand.

## My role

| Responsibility | What it involved |
|---|---|
| **Defining requirements** | Product scope and non-goals (no accounts, database or SaaS features), inputs, the results the app must show, security rules, error cases, demo-data rules |
| **Designing the five-stage architecture** | Five logically isolated stages under an orchestrator, instead of one monolithic prompt |
| **Specifying agent behavior** | What each agent does, what context it receives, what it returns, and what it must never do (e.g. invent skills, metrics or experience) |
| **Orchestrating AI-assisted development** | Directing the coding assistant through implementation, verification, testing, evaluation and documentation |
| **Reviewing results** | Reviewing the implementation, the analyses it produced and the test reports against the specification |
| **Directing testing** | Defining the audit, the hallucination-trap scenarios A–G, the performance metrics, and what counts as pass or fail |
| **Evaluating failures** | Reviewing the failures the tests exposed and deciding they had to be fixed and re-run rather than explained away |
| **Refining prompts** | Iterating on the per-agent instructions and output constraints based on evaluation results |
| **Managing deployment** | API key and environment management, and deployment to Vercel |

## What the AI assistant did

It scaffolded the project, implemented every module, wrote the unit tests and evaluation harness, ran type checks, lint, builds and live evaluations, diagnosed and fixed defects, and drafted this documentation.

## Implementation decisions

These were proposed by the AI assistant during implementation and kept after review:

- **Deterministic scoring.** Models are inconsistent at producing numbers, so scores come from a fixed formula over verified evidence. The scoring agent explains the numbers but cannot change them.
- **Guardrails in code, not only in prompts.** Evidence quotes are verified against the resume. Suggestions that misquote the original, add numbers, or add leadership/ownership verbs the resume never uses are rejected automatically.
- **Validator isolation.** The validation agent never sees the job description, so the employer's wishes can't pull it toward approving a stretch.
- **Real progress streaming.** The API streams NDJSON stage events, so the progress UI reflects what is actually happening on the server.
- **Safe concurrency.** Only Scoring and Recommendations run in parallel, since both depend only on stages 1–2. A failure in one aborts the other.

## Verification history

1. **Mock-API end-to-end (no key yet).** The full pipeline ran against a local mock of the Anthropic API. This confirmed live progress, the complete report, hallucinated-quote downgrading, whole-word keyword matching, rejection of an invented metric, and the error paths (empty/oversized/invalid input, missing key, malformed output, network failure).
2. **First real-API run.** Surfaced three integration issues, all fixed:
   - The key file was saved as `.env.local.txt` (Windows hides extensions), so Next.js never loaded it.
   - A key not scoped to a workspace was rejected. Optional `ANTHROPIC_WORKSPACE_ID` support and a clear error were added; the final key is workspace-scoped.
   - A generic 400 told users to "shorten your inputs". The message is now neutral, and exhausted credits now get their own message.
3. **Audit and tests.** 28 unit tests (`npm test`) cover the guardrails, scoring, error mapping, and the orchestrator. The orchestrator tests check what each stage's model input contains, to confirm stage isolation.
4. **Adversarial evaluation.** 7 hallucination-trap cases × 5 runs, plus 357 injected validation test items. This found real failures: evidence overstatement, and an "Owned" exaggeration that reached the final output in run 1. It also found bugs in the new checks. Everything found was fixed and re-run. See [VALIDATION_TESTS.md](VALIDATION_TESTS.md).
5. **Performance metrics.** 5 realistic pairs run one at a time: 87.7 s average, 0 errors. See [METRICS.md](METRICS.md).
6. **Portfolio review.** Code clean-up (Stage 5 merge rules moved to their own module, UI labels moved out of `lib/`, a shared Button, dead props removed) and UI polish (compact header during analysis, an elapsed timer, a responsive stage tracker, clearer recommendation and validation presentation). The recommendation prompt now asks for plain-language requirement names instead of ids. That prompt change came after the evaluation and has not been re-evaluated.

7. **Resume file upload.** PDF/.docx upload with server-side text extraction (unpdf and mammoth; no AI call). Verification was kept deliberately light to save API credits:
   - 7 new unit tests against generated PDF and .docx fixtures, including a check that extracted resume lines, even ones wrapped across PDF lines, still pass evidence quote verification;
   - endpoint checks for PDF, .docx, a wrong type, a legacy .doc, an oversized file and a missing file, on both the dev and production builds;
   - browser checks of drag-and-drop, the file picker and the error messages;
   - **one** real analysis on PDF-extracted text: all five stages completed in 90 s, and all 17 evidence quotes verified against the extracted text.

Every step ended with `npx tsc --noEmit`, `npm run lint` and `npm run build` passing. The production client bundle was checked for API key or Anthropic API references (none).
