import type { AnalysisReport } from "@/types/analysis";
import { AgentInsights } from "./AgentInsights";
import { KeywordAnalysis } from "./KeywordAnalysis";
import { MatchSections } from "./MatchSections";
import { Recommendations } from "./Recommendations";
import { ScoreOverview } from "./ScoreOverview";
import { ValidationReport } from "./ValidationReport";

export function ResultsView({ report }: { report: AnalysisReport }) {
  return (
    <div className="space-y-4">
      <ScoreOverview report={report} />
      <MatchSections report={report} />
      <KeywordAnalysis keywords={report.keywords} />
      <Recommendations report={report} />
      <ValidationReport validation={report.validation} />
      <AgentInsights report={report} />
    </div>
  );
}
