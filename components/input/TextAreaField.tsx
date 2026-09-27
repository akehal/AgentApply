import { cx } from "@/components/ui/primitives";

interface TextAreaFieldProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  maxChars: number;
  placeholder: string;
  onChange: (value: string) => void;
}

export function TextAreaField({ id, label, hint, value, maxChars, placeholder, onChange }: TextAreaFieldProps) {
  const over = value.length > maxChars;
  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-zinc-200">
          {label}
        </label>
        <span className={cx("font-mono text-xs tabular-nums", over ? "text-rose-400" : "text-zinc-500")}>
          {value.length.toLocaleString()} / {maxChars.toLocaleString()}
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-invalid={over}
        aria-describedby={`${id}-hint`}
        className={cx(
          "h-[22rem] w-full resize-y rounded-xl border bg-black/30 p-4 font-mono text-[13px] leading-relaxed text-zinc-200",
          "placeholder:text-zinc-600 focus:outline-none focus:ring-2",
          over ? "border-rose-500/50 focus:ring-rose-500/40" : "border-white/[0.08] focus:ring-accent/40",
        )}
      />
      <p id={`${id}-hint`} className="mt-2 text-xs text-zinc-500">
        {hint}
      </p>
    </div>
  );
}
