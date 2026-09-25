import type { Check, CheckState, PersonEvaluation } from "@/lib/matching/engine";
import type { Listing } from "@/lib/types";
import { cn } from "./ui";

const stateStyle: Record<CheckState, { tone: string; label: string }> = {
  met: { tone: "text-good bg-good-soft", label: "Meets" },
  compromise: { tone: "text-warn bg-warn-soft", label: "Compromise" },
  unmet: { tone: "text-bad bg-bad-soft", label: "Does not meet" },
  unknown: { tone: "text-muted bg-ink/5", label: "Unknown" },
};

export function StateIcon({ state, className }: { state: CheckState; className?: string }) {
  const s = stateStyle[state];
  return (
    <span
      role="img"
      aria-label={s.label}
      className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full", s.tone, className)}
    >
      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {state === "met" && <path d="M3.5 8.5l3 3 6-7" />}
        {state === "compromise" && <path d="M4 8h8" />}
        {state === "unmet" && <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />}
        {state === "unknown" && <path d="M6 6.2a2 2 0 113 1.7c-.6.4-1 .8-1 1.6M8 12h.01" />}
      </svg>
    </span>
  );
}

export function ScoreRing({ value, size = 64, label }: { value: number; size?: number; label?: string }) {
  const stroke = size > 50 ? 5 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn("font-semibold tabular-nums", size > 50 ? "text-lg" : "text-sm")}>{value}</span>
        {label && <span className="mt-0.5 text-[10px] text-muted">{label}</span>}
      </div>
    </div>
  );
}

export function ScoreBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden>
      <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${value}%` }} />
    </div>
  );
}

const PALETTE = ["#d9e7e4", "#e9e2d6", "#dfe2ea", "#e8dfe3", "#e2e8da"];

export function ListingThumb({ listing, className }: { listing: Listing; className?: string }) {
  if (listing.images[0]) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied hosts
      <img src={listing.images[0]} alt={listing.title} className={cn("object-cover", className)} loading="lazy" />
    );
  }
  const hue = PALETTE[[...listing.area].reduce((s, ch) => s + ch.charCodeAt(0), 0) % PALETTE.length];
  return (
    <div className={cn("relative flex items-end overflow-hidden", className)} style={{ background: hue }} aria-hidden>
      <svg viewBox="0 0 120 60" className="absolute inset-x-0 bottom-0 w-full text-ink/10" preserveAspectRatio="xMidYMax slice">
        <path fill="currentColor" d="M0 60V38h10V26h14v12h8V18h18v20h6V30h12v8h10V22h16v16h8V32h18v28z" />
      </svg>
      <span className="relative m-3 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-ink/70 backdrop-blur">
        {listing.area}
      </span>
    </div>
  );
}

const statusCopy: Record<PersonEvaluation["status"], { text: string; tone: string }> = {
  works: { text: "Works", tone: "text-good" },
  missing_must: { text: "Misses a must-have", tone: "text-bad" },
  dealbreaker: { text: "Does not work", tone: "text-bad" },
};

/** "What each person gets / gives up" block used on result cards. */
export function PersonFit({ person, compact = false }: { person: PersonEvaluation; compact?: boolean }) {
  const rentMet = person.checks.some((c) => c.key === "rent" && c.state === "met");
  // Hide "absence of a problem" checks on cards; they're listed on the detail page.
  const gets = person.checks.filter(
    (c) =>
      c.state === "met" &&
      c.key !== "excluded-area" &&
      c.key !== "ground-floor" &&
      !(c.key === "budget" && rentMet),
  );
  const gives = person.checks.filter((c) => c.state === "compromise" || c.state === "unmet");
  const unknown = person.checks.filter((c) => c.state === "unknown");
  const limit = compact ? 3 : 99;
  const s = statusCopy[person.status];
  return (
    <div className="rounded-2xl bg-canvas/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Avatar name={person.name} />
          <span className="font-medium">{person.name}</span>
          {person.status !== "works" && <span className={cn("text-xs font-medium", s.tone)}>{s.text}</span>}
        </div>
        <span className="text-sm tabular-nums text-muted">
          <span className="font-semibold text-ink">{person.score}</span>
          /100
        </span>
      </div>
      <ul className="space-y-1.5 text-sm">
        {gets.slice(0, limit).map((c) => (
          <CheckRow key={c.key} check={c} prefix="Gets" />
        ))}
        {gives.map((c) => (
          <CheckRow key={c.key} check={c} prefix={c.state === "unmet" ? "Fails" : "Gives up"} />
        ))}
        {unknown.slice(0, limit).map((c) => (
          <CheckRow key={c.key} check={c} prefix="Check" />
        ))}
        {gets.length === 0 && gives.length === 0 && unknown.length === 0 && (
          <li className="text-muted">No specific requirements for this flat.</li>
        )}
      </ul>
    </div>
  );
}

function CheckRow({ check, prefix }: { check: Check; prefix: string }) {
  return (
    <li className="flex items-start gap-2" title={check.detail}>
      <StateIcon state={check.state} className="mt-px" />
      <span>
        <span className="sr-only">{prefix}: </span>
        {check.label}
        {check.kind === "must" && check.state !== "unknown" && <span className="ml-1 text-xs text-faint">must-have</span>}
        {check.kind === "dealbreaker" && check.state === "unmet" && <span className="ml-1 text-xs text-bad">dealbreaker</span>}
      </span>
    </li>
  );
}

export function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const colors = ["bg-[#dcebe8] text-[#0b5953]", "bg-[#efe4d3] text-[#7a4a12]", "bg-[#e1e3f0] text-[#343d7a]", "bg-[#f0dfe5] text-[#7d2645]"];
  const idx = [...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % colors.length;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" ? "size-7 text-xs" : "size-10 text-sm",
        colors[idx],
      )}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <StateIcon state="met" /> Meets requirement
      </span>
      <span className="flex items-center gap-1.5">
        <StateIcon state="compromise" /> Compromise
      </span>
      <span className="flex items-center gap-1.5">
        <StateIcon state="unmet" /> Does not meet
      </span>
      <span className="flex items-center gap-1.5">
        <StateIcon state="unknown" /> Not known / not applicable
      </span>
    </div>
  );
}
