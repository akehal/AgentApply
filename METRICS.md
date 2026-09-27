# Metrics

Measured on 2026-09-27 against the live Claude API (`claude-opus-5`). All test data is fictional. Raw data: `evals/results/metrics-final.json` (performance) and `evals/results/adversarial-run{1..5}.json` (validation). Harness: `evals/runMetrics.ts`, `evals/runAdversarial.ts`.

No manual-review-time metric was measured or estimated. That comparison is for the project owner to measure separately.

---

## 1. Performance test pairs

Five realistic, fictional pairs, chosen to vary field, seniority and degree of fit:

| ID | Pair | Expected fit |
|---|---|---|
| M1 | Marketing analyst → Data Analyst | Moderate |
| M2 | Java/Spring engineer → Go backend engineer | Partial |
| M3 | Med-surg RN → ICU RN (non-tech) | Partial |
| M4 | Social media specialist → Marketing Coordinator | Strong |
| M5 | Graphic designer → Product (UX) Designer | Weak–moderate |

**Method:** each pair ran once through the complete five-stage pipeline, **one after another** (no concurrent requests), from a local machine over a home connection. Duration is wall-clock time from the start of Stage 1 to the final report. It excludes HTTP/Next.js overhead, which a live UI run measured at under 0.1 s of the total. The code was the post-fix version from validation run 3. Later changes (the hyphen fix in the leadership-verb pre-check and the credit-error mapping) didn't affect any recommendation in these five runs: no metrics recommendation was rejected by a pre-check alone. A later presentation-only prompt change (plain-language requirement names in "reason") was not re-measured.

### 1.1 Raw results

| ID | Total duration | Criteria extracted | Criteria evaluated | Recs generated | Approved | Rejected | Errors | Overall score |
|---|---|---|---|---|---|---|---|---|
| M1 | 100.0 s | 12 | 12 | 7 | 6 | 1 | 0 | 57 |
| M2 | 97.9 s | 9 | 9 | 6 | 3 | 3 | 0 | 66 |
| M3 | 65.6 s | 11 | 11 | 7 | 4 | 3 | 0 | 46 |
| M4 | 90.6 s | 12 | 12 | 7 | 6 | 1 | 0 | 87 |
| M5 | 84.3 s | 10 | 10 | 6 | 5 | 1 | 0 | 28 |

The overall scores rank in the order the pairs were designed to fit (M4 strong > M2/M1 > M3 > M5 weak). With five data points, that's a sanity check, not a validation of the scores.

Per-stage durations (seconds; Scoring and Recommendations run in parallel):

| Stage | Avg | Min | Max |
|---|---|---|---|
| 1. Requirement Extraction | 8.9 | 8.1 | 10.0 |
| 2. Evidence Matching | 14.2 | 10.8 | 20.9 |
| 3. Scoring | 14.7 | 11.6 | 18.2 |
| 4. Recommendations | **44.3** | 26.9 | 60.3 |
| 5. Validation | 20.3 | 14.7 | 26.7 |

Recommendations is the bottleneck. Because Validation must wait for it, the critical path is Stage 1 → 2 → 4 → 5.

The 9 rejections in these runs were for added scope or claims (e.g. "for services in production", "IV infusion therapy" when the resume says "IV therapy", "brand identity *systems*"). The AI validator made every rejection; the pre-checks forced none.

### 1.2 Calculated performance metrics

| Metric | Value |
|---|---|
| Average analysis duration | **87.7 s** |
| Minimum analysis duration | **65.6 s** (M3) |
| Maximum analysis duration | **100.0 s** (M1) |
| Median analysis duration | 90.6 s |
| Average criteria extracted | 10.8 |
| Average criteria evaluated | **10.8** (every extracted criterion was evaluated in every run) |
| Recommendations generated / approved / rejected | 33 / 24 / 9 (72.7% approved) |
| Errors encountered | **0** of 5 runs |

Other real runs of the same pipeline, for context only (not part of the five-pair metric): the demo pair through the browser UI took 88 s and 78 s. Adversarial runs used 3 at a time in parallel and took 42–100 s.

---

## 2. Validation metrics

Full methodology is in VALIDATION_TESTS.md. There are two kinds of test, reported separately so that neither inflates the other.

### 2.1 Test counts

| Item | Count |
|---|---|
| Adversarial cases | 7 |
| Full-workflow adversarial runs (7 cases × 5 runs) | 35 (35 completed all 5 stages) |
| Natural recommendations produced and validated in those runs | 197 |
| Injection trials attempted / completed | 105 / 102 (3 failed in run 4: API account ran out of credits; run 5 repeated the suite) |
| Injected fabricated recommendations evaluated | 255 |
| Injected honest controls evaluated | 102 |
| **Total validation test items** (injected items with known ground truth) | **357** |
| Total recommendation verdicts observed (357 injected + 197 natural) | 554 |

### 2.2 Unsupported recommendations caught vs. reaching final output

| Source | Unsupported items | Caught (rejected) | Reached final output (approved) |
|---|---|---|---|
| Injected fabrications (known ground truth) | 255 | **255** | **0** |
| Natural: clear unsupported claims (oracle flags confirmed by review, plus review-found) | 11 | 10 | **1** (run 1, "Designed" → "Owned", before the fix) |
| Natural: gray area, true descriptor that adds a job keyword (Redis as "NoSQL") | 9 | 3 | 6 |

- **"Caught" includes both validation layers.** For injected items the AI validator alone rejected all 255. The deterministic pre-checks also flagged 70 of them.
- **The 11 clear natural items:** "comparable to AWS EC2/S3" analogies (4), "Mentored a new intern" (5), "self-directed coursework" (1), all rejected; and "Owned database schema design" (1, approved in run 1).
- **Borderline approvals** that the AI assistant's review judged overstretched but not clearly false are *not* counted as unsupported above. They are listed individually in VALIDATION_TESTS.md §4.2: 5 "Linux administration" relabels (runs 1–3), a few puffery phrases in run 1, one title parenthetical and one minor broadening in run 4, and one minor wording drift in run 5. If you count them, the "reached final output" number for natural runs goes up.

### 2.3 Honest-control approval (false-rejection check)

| Item | Result |
|---|---|
| Controls approved, all | 99 / 102 (97.1%) |
| Controls approved, excluding one flawed control that added unsupported words | 93 / 93 |

### 2.4 Evidence-stage accuracy on trap requirements

| | Run 1 (before fix) | Runs 2–5 (after fix) |
|---|---|---|
| Trap requirements overstated as `partial`/`strong` (after review) | 2, plus 1 rubric flaw | 0 |
| Trap requirement reported as a gap | 7/7 | 28/28 |

---

## 3. Which numbers are defensible for a resume

**Defensible, with the stated context:**
- "Designed a five-stage multi-agent pipeline; a typical analysis completes in **~1.5 minutes** (65–100 s over 5 sequential test runs, 0 errors)."
- "Built an adversarial evaluation harness: **7 hallucination-trap cases, 35 full-pipeline runs, 357 injected validation test items**."
- "The independent validation stage rejected **all 255** injected fabricated recommendations while approving **93 of 93** clean honest controls" — adding that these were author-written test cases.
- "Found and fixed evidence-overstatement and exaggeration failures through adversarial testing; post-fix runs showed no clear fabrications in approved output."

**Not defensible; avoid:**
- Any claim of a real-world hallucination or accuracy *rate* ("100% accurate", "eliminates hallucinations"). The test set is small, author-built, and the fixes were tuned on it.
- Any comparison of speed or time saved against manual review. That hasn't been measured yet.
- Any claim that scores match employer ATS results or predict hiring outcomes.
- Using the 554 "verdicts observed" figure as a test count without explaining that 197 of them have no ground truth.
