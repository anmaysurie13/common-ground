"use client";

import { useState, type ReactNode } from "react";
import { cn, inputClass } from "./ui";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-full bg-ink/5 p-1 sm:w-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition sm:flex-none",
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ToggleCard({
  checked,
  onChange,
  title,
  description,
  disabled,
  tone = "accent",
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description?: ReactNode;
  disabled?: boolean;
  tone?: "accent" | "bad";
  children?: ReactNode;
}) {
  const on = tone === "bad" ? "border-bad/40 bg-bad-soft/60" : "border-accent/40 bg-accent-soft/60";
  return (
    <div className={cn("rounded-2xl border p-4 transition", checked ? on : "border-line bg-surface", disabled && "opacity-55")}>
      <label className={cn("flex items-start gap-3", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className={cn("mt-0.5 size-4.5 shrink-0", tone === "bad" ? "accent-bad" : "accent-accent")}
        />
        <span>
          <span className="block text-sm font-medium">{title}</span>
          {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
        </span>
      </label>
      {children && checked && <div className="mt-3 pl-7">{children}</div>}
    </div>
  );
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  label,
  tone = "accent",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  label: string;
  tone?: "accent" | "bad";
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t || value.some((v) => v.toLowerCase() === t.toLowerCase()) || value.length >= 20) return;
    onChange([...value, t.slice(0, 60)]);
    setDraft("");
  };
  const chip = tone === "bad" ? "bg-bad-soft text-bad" : "bg-accent-soft text-accent-strong";
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((v) => (
            <span key={v} className={cn("inline-flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-sm font-medium", chip)}>
              {v}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="rounded-full px-1.5 leading-none opacity-60 hover:opacity-100"
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => add(draft)}
        placeholder={placeholder}
        className={inputClass}
      />
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-muted transition hover:border-ink/30 hover:text-ink"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}) {
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">{prefix}</span>}
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className={cn(inputClass, "tabular-nums", prefix && "pl-8", suffix && "pr-14")}
      />
      {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{suffix}</span>}
    </div>
  );
}
