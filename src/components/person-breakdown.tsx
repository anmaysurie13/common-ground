import type { CheckKind, PersonEvaluation } from "@/lib/matching/engine";
import { Avatar, ScoreBar, StateIcon } from "./match-ui";
import { Badge, Card } from "./ui";

const GROUPS: { kind: CheckKind; title: string }[] = [
  { kind: "dealbreaker", title: "Dealbreakers" },
  { kind: "must", title: "Must-haves" },
  { kind: "preference", title: "Preferences" },
];

export function PersonBreakdown({ person }: { person: PersonEvaluation }) {
  const b = person.breakdown;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={person.name} size="md" />
          <div>
            <p className="font-semibold">{person.name}</p>
            {person.status === "works" ? (
              <Badge tone="good">Works</Badge>
            ) : person.status === "dealbreaker" ? (
              <Badge tone="bad">Does not work — dealbreaker</Badge>
            ) : (
              <Badge tone="bad">Misses a must-have</Badge>
            )}
          </div>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{person.score}</p>
      </div>
      <div className="mt-4">
        <ScoreBar value={person.score} />
        <p className="mt-2 text-xs text-muted tabular-nums">
          Must-haves {b.mustPoints}/{b.mustMax} + preferences {b.preferencePoints}/{b.preferenceMax}
          {b.penalty > 0 && ` − compromises ${b.penalty}`} = {b.total}
        </p>
      </div>
      <div className="mt-5 space-y-4">
        {GROUPS.map(({ kind, title }) => {
          const checks = person.checks.filter((c) => c.kind === kind);
          if (checks.length === 0) return null;
          return (
            <div key={kind}>
              <p className="text-xs font-medium uppercase tracking-wide text-faint">{title}</p>
              <ul className="mt-2 space-y-2">
                {checks.map((c) => (
                  <li key={c.key} className="flex items-start gap-2.5 text-sm">
                    <StateIcon state={c.state} className="mt-px" />
                    <span className="text-muted">
                      <span className="font-medium text-ink">{c.label}.</span> {c.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {person.otherConstraints && (
          <p className="rounded-2xl bg-canvas/70 p-3 text-sm text-muted">
            <span className="font-medium text-ink">Also noted:</span> “{person.otherConstraints}” — not checked automatically.
          </p>
        )}
      </div>
    </Card>
  );
}
