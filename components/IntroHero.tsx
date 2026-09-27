import { STAGES } from "@/lib/constants";

/** Product introduction, shown only on the input screen. */
export function IntroHero() {
  return (
    <section className="mb-8">
      <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
        See how your resume aligns with a role, backed by quoted evidence.
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
        Five isolated AI agents extract the job&apos;s requirements, match them to evidence in your resume, score alignment
        with a transparent formula, suggest honest improvements, and independently audit those suggestions for fabrication.
      </p>
      <ol className="mt-5 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs text-zinc-400" aria-label="Pipeline stages">
        {STAGES.map((s, i) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1">
              <span className="mr-1.5 font-mono text-zinc-500">{i + 1}</span>
              {s.label}
            </span>
            {i < STAGES.length - 1 && (
              <span aria-hidden className="text-zinc-600">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
