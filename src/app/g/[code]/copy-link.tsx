"use client";

import { useState } from "react";
import { Button, inputClass } from "@/components/ui";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 flex gap-2">
      <input readOnly value={url} className={`${inputClass} font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} aria-label="Invite link" />
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
