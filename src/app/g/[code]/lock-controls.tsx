"use client";

import { useState, useTransition } from "react";
import { lockGroupAction, unlockGroupAction } from "@/app/actions";
import { Button, ErrorNote } from "@/components/ui";

export function LockControls({
  code,
  status,
  allSubmitted,
  isMember,
}: {
  code: string;
  status: "collecting" | "locked";
  allSubmitted: boolean;
  isMember: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "locked") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Need to change something? Reopening pauses matching until you lock again.</p>
        {isMember && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await unlockGroupAction(code);
                if (!r.ok) setError(r.error);
              })
            }
          >
            Reopen preferences
          </Button>
        )}
        <ErrorNote>{error}</ErrorNote>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {allSubmitted
            ? "Locking freezes everyone's preferences so listings are judged against the same rules."
            : "Matching unlocks once every person has submitted."}
        </p>
        <Button
          disabled={!allSubmitted || !isMember || pending}
          onClick={() =>
            start(async () => {
              const r = await lockGroupAction(code);
              if (r && !r.ok) setError(r.error);
            })
          }
        >
          {pending ? "Locking…" : "Lock preferences & match"}
        </Button>
      </div>
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}
