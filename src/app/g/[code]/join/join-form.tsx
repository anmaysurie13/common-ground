"use client";

import { useActionState } from "react";
import { joinGroupAction } from "@/app/actions";
import { Button, ErrorNote, Field, inputClass } from "@/components/ui";

export function JoinForm({ code, taken }: { code: string; taken: string[] }) {
  const [state, action, pending] = useActionState(joinGroupAction.bind(null, code), null);
  return (
    <form action={action} className="space-y-5">
      {taken.length > 0 && <p className="text-sm text-muted">Already in: {taken.join(", ")}</p>}
      <Field label="Your name">
        <input name="name" required maxLength={40} autoFocus placeholder="e.g. Meera" className={inputClass} />
      </Field>
      <ErrorNote>{state && !state.ok ? state.error : null}</ErrorNote>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Joining…" : "Join & set my preferences"}
      </Button>
    </form>
  );
}
