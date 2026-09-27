import { AnalyzerApp } from "@/components/AnalyzerApp";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <header className="mb-8 flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 font-mono text-sm font-bold text-accent"
        >
          A
        </span>
        <span className="text-lg font-semibold tracking-tight text-zinc-100">ApplyAgent</span>
        <span className="ml-1 hidden text-sm text-zinc-500 sm:inline">Multi-agent resume analysis</span>
      </header>

      <AnalyzerApp />

      <footer className="mt-12 text-center text-xs text-zinc-600">
        ApplyAgent provides AI-generated estimates for guidance only. It is not an employer ATS and does not predict hiring
        outcomes.
      </footer>
    </main>
  );
}
