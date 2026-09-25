"use client";

import { useState, useTransition } from "react";
import { explainListingAction } from "@/app/actions";
import { Button } from "./ui";

export function ExplainButton({ code, listingId, aiEnabled }: { code: string; listingId: string; aiEnabled: boolean }) {
  const [result, setResult] = useState<{ text: string; source: "ai" | "rules" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-2xl border border-line bg-canvas/60 p-4">
      {result ? (
        <>
          <p className="text-sm leading-relaxed">{result.text}</p>
          <p className="mt-2 text-xs text-faint">
            {result.source === "ai"
              ? "Written by Gemini from the checks below. It can't change eligibility or scores."
              : "Generated from the checks below."}
          </p>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Want the short version in plain words?</p>
          <Button
            variant="secondary"
            className="h-9 px-4"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await explainListingAction(code, listingId);
                if (!r.ok) return setError(r.error);
                setResult({ text: r.text, source: r.source });
              })
            }
          >
            {pending ? "Summarising…" : aiEnabled ? "Summarise with AI" : "Summarise"}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
