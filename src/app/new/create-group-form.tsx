"use client";

import { useActionState } from "react";
import { createGroupAction } from "../actions";
import { Button, ErrorNote, Field, inputClass } from "@/components/ui";

export function CreateGroupForm() {
  const [state, action, pending] = useActionState(createGroupAction, null);
  return (
    <form action={action} className="space-y-5">
      <Field label="Group name">
        <input name="name" required maxLength={60} placeholder="e.g. Baner flat hunt" className={inputClass} />
      </Field>
      <Field label="Your name">
        <input name="creatorName" required maxLength={40} placeholder="e.g. Riya" className={inputClass} />
      </Field>
      <Field label="Number of people" hint="Common Ground is designed around three flatmates.">
        <select name="size" defaultValue="3" className={inputClass}>
          <option value="2">2 people</option>
          <option value="3">3 people</option>
          <option value="4">4 people</option>
        </select>
      </Field>
      <ErrorNote>{state && !state.ok ? state.error : null}</ErrorNote>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Create group & get invite link"}
      </Button>
    </form>
  );
}
