import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-2xl border border-white/[0.07] bg-surface p-5 sm:p-6", className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  title,
  subtitle,
  aside,
}: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}

export type Tone = "green" | "amber" | "sky" | "rose" | "zinc" | "violet";

const TONE_CLASSES: Record<Tone, string> = {
  green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  sky: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  zinc: "border-white/10 bg-white/5 text-zinc-300",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-300",
};

export function Badge({ tone = "zinc", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

const BUTTON_VARIANTS = {
  primary:
    "bg-accent font-semibold text-zinc-950 shadow-lg shadow-accent/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50",
  secondary: "border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-50",
} as const;

export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANTS }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "rounded-lg px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        BUTTON_VARIANTS[variant],
        className,
      )}
    />
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-sm italic text-zinc-500">{children}</p>;
}
