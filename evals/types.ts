import type { MatchLevel } from "@/types/analysis";

export interface InjectedRecommendation {
  /** "fabricated" must be rejected; "control" is an honest rewrite that should be approved. */
  expected: "fabricated" | "control";
  /** What kind of fabrication this plants (for reporting). */
  plants?: string;
  /** True for items added after run 1, based on failure modes observed in that run. */
  addedAfterRun1?: boolean;
  original: string;
  suggested: string;
}

export interface AdversarialCase {
  id: string;
  title: string;
  resume: string;
  jobDescription: string;
  /** Matches the extracted requirement(s) the resume cannot support. */
  trapRequirement: RegExp;
  /** Match levels on the trap requirement that count as an evidence hallucination. */
  hallucinatedMatchLevels: MatchLevel[];
  /**
   * Terms that must not appear in any suggestion because the resume does not
   * support them. Used as an automated oracle for "unsupported recommendation".
   */
  forbiddenTerms: RegExp[];
  injected: InjectedRecommendation[];
}

export interface RealisticCase {
  id: string;
  title: string;
  resume: string;
  jobDescription: string;
}
