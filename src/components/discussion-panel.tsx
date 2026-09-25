"use client";

import { useState, useTransition } from "react";
import { addNoteAction, toggleFlagAction } from "@/app/actions";
import type { FlagKind, ListingFlag, ListingNote } from "@/lib/types";
import { Avatar } from "./match-ui";
import { Button, Card, ErrorNote, cn, inputClass } from "./ui";

interface Person {
  id: string;
  name: string;
}

export function DiscussionPanel({
  code,
  listingId,
  members,
  me,
  flags,
  notes,
}: {
  code: string;
  listingId: string;
  members: Person[];
  me: Person[];
  flags: ListingFlag[];
  notes: ListingNote[];
}) {
  const [actingId, setActingId] = useState(me[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const has = (memberId: string, kind: FlagKind) => flags.some((f) => f.memberId === memberId && f.kind === kind);
  const who = (kind: FlagKind) => members.filter((m) => has(m.id, kind)).map((m) => m.name);

  const toggle = (kind: FlagKind) =>
    start(async () => {
      const r = await toggleFlagAction(code, listingId, actingId, kind, !has(actingId, kind));
      if (!r.ok) setError(r.error);
    });

  return (
    <Card className="p-6">
      <h3 className="font-semibold">Discuss</h3>
      <p className="mt-1 text-sm text-muted">Mark what&apos;s worth talking about. Nothing here picks a flat for you.</p>

      {me.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Acting as">
          {me.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={actingId === m.id}
              onClick={() => setActingId(m.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                actingId === m.id ? "border-ink bg-ink text-white" : "border-line text-muted hover:text-ink",
              )}
            >
              as {m.name}
            </button>
          ))}
        </div>
      )}

      {me.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <FlagButton active={has(actingId, "discuss")} disabled={pending} onClick={() => toggle("discuss")} label="Worth discussing" />
          <FlagButton active={has(actingId, "saved")} disabled={pending} onClick={() => toggle("saved")} label="Save" />
        </div>
      )}

      <div className="mt-4 space-y-1 text-sm text-muted">
        <p>
          Worth discussing: {who("discuss").length ? <span className="text-ink">{who("discuss").join(", ")}</span> : "nobody yet"}
        </p>
        <p>Saved by: {who("saved").length ? <span className="text-ink">{who("saved").join(", ")}</span> : "nobody yet"}</p>
      </div>

      <div className="mt-6 border-t border-line/70 pt-5">
        <p className="text-sm font-medium">Notes</p>
        <ul className="mt-3 space-y-3">
          {notes.length === 0 && <li className="text-sm text-muted">No notes yet.</li>}
          {notes.map((n) => (
            <li key={n.id} className="flex gap-3">
              <Avatar name={n.authorName} />
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  {n.authorName}{" "}
                  <span className="text-xs font-normal text-faint">{new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </p>
                <p className="whitespace-pre-wrap break-words text-muted">{n.body}</p>
              </div>
            </li>
          ))}
        </ul>
        {me.length > 0 && (
          <form
            className="mt-4 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!body.trim()) return;
              start(async () => {
                const r = await addNoteAction(code, listingId, actingId, body);
                if (!r.ok) return setError(r.error);
                setBody("");
                setError(null);
              });
            }}
          >
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Add a note for the group…"
              className={cn(inputClass, "h-auto py-3 text-sm")}
            />
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" disabled={pending || !body.trim()} className="h-9 px-4">
                Post note
              </Button>
            </div>
          </form>
        )}
        <div className="mt-2">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </div>
    </Card>
  );
}

function FlagButton({ active, onClick, label, disabled }: { active: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border px-3 py-2.5 text-sm font-medium transition active:scale-[0.98]",
        active ? "border-accent bg-accent-soft text-accent-strong" : "border-line hover:border-ink/25",
      )}
    >
      {active ? "✓ " : ""}
      {label}
    </button>
  );
}
