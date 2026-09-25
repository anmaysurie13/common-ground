"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { draftPreferencesAction, savePreferencesAction } from "@/app/actions";
import { NumberInput, Segmented, TagInput, ToggleCard } from "@/components/form-controls";
import { Button, Card, ErrorNote, Field, cn, inputClass } from "@/components/ui";
import { describePreferences } from "@/lib/describe";
import { inr } from "@/lib/format";
import type { Furnishing, Importance, Preferences } from "@/lib/types";

const STEPS = ["Budget", "Location", "Commute", "Must-haves", "Dealbreakers", "Preferences", "Review"] as const;

const AREA_SUGGESTIONS = ["Baner", "Balewadi", "Aundh", "Kothrud", "Karve Nagar", "Bavdhan", "Wakad", "Hinjewadi", "Viman Nagar", "Kharadi", "Hadapsar", "Koregaon Park"];
const AMENITY_SUGGESTIONS = ["balcony", "gym", "power backup", "24x7 security", "washing machine", "pool", "garden"];

type FeatureKey = "lift" | "parking" | "petFriendly";
const FEATURES: { key: FeatureKey; title: string; blurb: string; dealbreaker: keyof Preferences["dealbreakers"] }[] = [
  { key: "lift", title: "Lift", blurb: "Building has a working lift.", dealbreaker: "noLift" },
  { key: "parking", title: "Parking", blurb: "Dedicated car or two-wheeler parking.", dealbreaker: "noParking" },
  { key: "petFriendly", title: "Pet-friendly", blurb: "Owner and society allow pets.", dealbreaker: "notPetFriendly" },
];

export function PreferenceWizard({
  code,
  memberId,
  memberName,
  initial,
  aiEnabled,
  alreadySubmitted,
}: {
  code: string;
  memberId: string;
  memberName: string;
  initial: Preferences;
  aiEnabled: boolean;
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Preferences>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const update = (fn: (draft: Preferences) => void) =>
    setP((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  const stepError = validateStep(step, p);
  const next = () => {
    if (stepError) return setError(stepError);
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };
  const submit = () =>
    start(async () => {
      const r = await savePreferencesAction(code, memberId, p, true);
      if (!r.ok) return setError(r.error);
      router.push(`/g/${code}?submitted=1`);
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-sm text-muted">
          Step {step + 1} of {STEPS.length}
        </p>
        <div className="mb-4 h-1 overflow-hidden rounded-full bg-line lg:hidden">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <ol className="hidden space-y-1 lg:block">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => (i < step || !validateUpTo(i, p) ? (setError(null), setStep(i)) : undefined)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                  i === step ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                    i < step ? "bg-accent text-white" : i === step ? "bg-ink text-white" : "bg-ink/10",
                  )}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                {s}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-6 hidden space-y-2 rounded-2xl border border-dashed border-line p-4 text-xs text-muted lg:block">
          <p><span className="font-semibold text-ink">Must-have</span> = need</p>
          <p><span className="font-semibold text-ink">Preference</span> = would like</p>
          <p><span className="font-semibold text-ink">Dealbreaker</span> = no-go</p>
        </div>
      </aside>

      <Card className="p-6 sm:p-8">
        <div key={step} className="animate-rise">
          {step === 0 && (
            <StepBudget p={p} update={update} aiEnabled={aiEnabled} code={code} onDraft={(d) => setP(d)} />
          )}
          {step === 1 && <StepLocation p={p} update={update} />}
          {step === 2 && <StepCommute p={p} update={update} />}
          {step === 3 && <StepMustHaves p={p} update={update} />}
          {step === 4 && <StepDealbreakers p={p} update={update} />}
          {step === 5 && <StepPreferences p={p} update={update} />}
          {step === 6 && <StepReview p={p} name={memberName} />}
        </div>

        <div className="mt-8 space-y-4 border-t border-line/70 pt-6">
          <ErrorNote>{error}</ErrorNote>
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={back} disabled={step === 0}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={submit} disabled={pending}>
                {pending ? "Saving…" : alreadySubmitted ? "Save changes" : "Submit my preferences"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function validateStep(step: number, p: Preferences): string | null {
  if (step === 0) {
    if (!Number.isFinite(p.budget.max) || p.budget.max <= 0) return "Add your maximum monthly contribution.";
    if (!Number.isFinite(p.budget.ideal) || p.budget.ideal <= 0) return "Add your ideal monthly contribution.";
    if (p.budget.ideal > p.budget.max) return "Your ideal can't be higher than your maximum.";
  }
  if (step === 1) {
    const clash = p.areas.preferred.find((a) => p.areas.excluded.some((e) => e.toLowerCase() === a.toLowerCase()));
    if (clash) return `${clash} is both preferred and ruled out.`;
  }
  if (step === 2 && (p.commute.importance !== "none" || p.dealbreakers.commuteOverLimit)) {
    if (!p.commute.destination.trim()) return "Where do you need to get to?";
    if (!Number.isFinite(p.commute.maxMinutes) || p.commute.maxMinutes < 1) return "Add a maximum commute time.";
  }
  return null;
}

function validateUpTo(target: number, p: Preferences): string | null {
  for (let i = 0; i < target; i++) {
    const e = validateStep(i, p);
    if (e) return e;
  }
  return null;
}

type StepProps = { p: Preferences; update: (fn: (d: Preferences) => void) => void };

function StepHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children && <p className="mt-1.5 text-sm text-muted">{children}</p>}
    </div>
  );
}

function StepBudget({
  p,
  update,
  aiEnabled,
  code,
  onDraft,
}: StepProps & { aiEnabled: boolean; code: string; onDraft: (p: Preferences) => void }) {
  return (
    <>
      {aiEnabled && <AiDraft code={code} current={p} onDraft={onDraft} />}
      <StepHeader title="What can you put towards rent?">
        Your personal monthly share — the rent is split evenly across the group. Anything above your maximum is
        automatically a dealbreaker.
      </StepHeader>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Maximum contribution" hint="Hard ceiling. Flats above this won't be shown as viable.">
          <NumberInput label="Maximum contribution" prefix="₹" suffix="/mo" step={500} min={0} value={p.budget.max} onChange={(v) => update((d) => void (d.budget.max = v))} />
        </Field>
        <Field label="Ideal contribution" hint="Comfortable amount. Paying more than this counts as a compromise.">
          <NumberInput label="Ideal contribution" prefix="₹" suffix="/mo" step={500} min={0} value={p.budget.ideal} onChange={(v) => update((d) => void (d.budget.ideal = v))} />
        </Field>
      </div>
    </>
  );
}

function AiDraft({ code, current, onDraft }: { code: string; current: Preferences; onDraft: (p: Preferences) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mb-8 rounded-2xl border border-line bg-canvas/60 p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left text-sm font-medium">
        <span>Prefer to just type it out? We can pre-fill the form.</span>
        <span className="text-muted">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="e.g. I can do ₹15k max, ideally 13k. I need a lift — stairs are a no-go. I'd like Baner or Aundh and two bathrooms. Never Hinjewadi."
            className={cn(inputClass, "h-auto py-3")}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await draftPreferencesAction(code, text);
                  if (!r.ok) return setMsg({ tone: "bad", text: r.error });
                  onDraft(mergeDraft(current, r.draft));
                  setMsg({ tone: "good", text: "Pre-filled what we understood. Check every step before submitting." });
                })
              }
            >
              {pending ? "Reading…" : "Pre-fill with AI"}
            </Button>
            <span className="text-xs text-muted">AI only suggests. Nothing is saved until you submit.</span>
          </div>
          {msg && <p className={cn("text-sm", msg.tone === "good" ? "text-good" : "text-bad")}>{msg.text}</p>}
        </div>
      )}
    </div>
  );
}

function mergeDraft(base: Preferences, d: Partial<Record<string, unknown>>): Preferences {
  const out = structuredClone(base) as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(d)) {
    if (v && typeof v === "object" && !Array.isArray(v)) out[k] = { ...(out[k] as object), ...(v as object) };
    else if (v !== undefined) out[k] = v;
  }
  return out as unknown as Preferences;
}

function StepLocation({ p, update }: StepProps) {
  return (
    <>
      <StepHeader title="Where would you like to live?">
        Preferred areas are nice-to-haves. Areas you won&apos;t consider are dealbreakers.
      </StepHeader>
      <div className="space-y-6">
        <Field label="Preferred areas">
          <TagInput label="Preferred areas" value={p.areas.preferred} onChange={(v) => update((d) => void (d.areas.preferred = v))} suggestions={AREA_SUGGESTIONS} placeholder="Type an area and press Enter" />
        </Field>
        <Field label="Areas I will NOT consider" hint="Any listing here is ruled out for you.">
          <TagInput tone="bad" label="Excluded areas" value={p.areas.excluded} onChange={(v) => update((d) => void (d.areas.excluded = v))} placeholder="Type an area and press Enter" />
        </Field>
      </div>
    </>
  );
}

function StepCommute({ p, update }: StepProps) {
  return (
    <>
      <StepHeader title="Is there somewhere you need to get to?">
        Office, college, family, gym — whatever matters most. Commute times are entered per listing, so nothing is guessed.
      </StepHeader>
      <div className="space-y-6">
        <Segmented<Importance>
          label="Commute importance"
          value={p.commute.importance}
          onChange={(v) => update((d) => void (d.commute.importance = v))}
          options={[
            { value: "must", label: "Need it" },
            { value: "nice", label: "Would like" },
            { value: "none", label: "No constraint" },
          ]}
        />
        {(p.commute.importance !== "none" || p.dealbreakers.commuteOverLimit) && (
          <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
            <Field label="Destination">
              <input value={p.commute.destination} maxLength={80} onChange={(e) => update((d) => void (d.commute.destination = e.target.value))} placeholder="e.g. Hinjewadi Phase 1" className={inputClass} />
            </Field>
            <Field label="Max commute">
              <NumberInput label="Max commute" suffix="min" min={1} max={300} value={p.commute.maxMinutes} onChange={(v) => update((d) => void (d.commute.maxMinutes = v))} />
            </Field>
          </div>
        )}
      </div>
    </>
  );
}

function StepMustHaves({ p, update }: StepProps) {
  return (
    <>
      <StepHeader title="What do you need?">
        Must-haves are requirements. A flat missing any of them isn&apos;t viable for you. Keep this list short and honest.
      </StepHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <ToggleCard
            key={f.key}
            title={f.title}
            description={p.dealbreakers[f.dealbreaker] ? "Also marked as a dealbreaker." : f.blurb}
            checked={p[f.key] === "must"}
            onChange={(on) => update((d) => void (d[f.key] = on ? "must" : d[f.key] === "must" ? "none" : d[f.key]))}
          />
        ))}
        <ToggleCard
          title="Minimum bathrooms"
          description="Enough bathrooms for the group."
          checked={p.bathrooms.importance === "must"}
          onChange={(on) => update((d) => void (d.bathrooms.importance = on ? "must" : "none"))}
        >
          <BathroomPicker p={p} update={update} />
        </ToggleCard>
        <ToggleCard
          title="Furnishing"
          description="A specific level of furnishing."
          checked={p.furnishing.importance === "must"}
          onChange={(on) => update((d) => void (d.furnishing.importance = on ? "must" : "none"))}
        >
          <FurnishingPicker p={p} update={update} />
        </ToggleCard>
      </div>
      <div className="mt-6">
        <Field label="Other must-have amenities" hint="Matched against the amenities listed on each flat.">
          <TagInput label="Must-have amenities" value={p.amenities.must} onChange={(v) => update((d) => void (d.amenities.must = v))} suggestions={AMENITY_SUGGESTIONS} placeholder="e.g. power backup" />
        </Field>
      </div>
    </>
  );
}

function StepDealbreakers({ p, update }: StepProps) {
  const set = (k: keyof Preferences["dealbreakers"]) => (on: boolean) => update((d) => void (d.dealbreakers[k] = on));
  return (
    <>
      <StepHeader title="What's a flat-out no?">
        Dealbreakers immediately rule a listing out for you. No score can outweigh them — including anything the AI says.
      </StepHeader>
      <div className="mb-5 space-y-2 rounded-2xl bg-canvas/70 p-4 text-sm">
        <p className="font-medium">Always dealbreakers for you</p>
        <p className="text-muted">Rent share above {Number.isFinite(p.budget.max) ? inr(p.budget.max) : "your max"}</p>
        {p.areas.excluded.length > 0 && <p className="text-muted">Flats in {p.areas.excluded.join(", ")}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleCard tone="bad" title="No lift" description="Stairs-only buildings are out." checked={p.dealbreakers.noLift} onChange={set("noLift")} />
        <ToggleCard tone="bad" title="No parking" checked={p.dealbreakers.noParking} onChange={set("noParking")} />
        <ToggleCard tone="bad" title="Not pet-friendly" checked={p.dealbreakers.notPetFriendly} onChange={set("notPetFriendly")} />
        <ToggleCard tone="bad" title="Ground floor" checked={p.dealbreakers.groundFloor} onChange={set("groundFloor")} />
        <ToggleCard
          tone="bad"
          title="Commute over my limit"
          description={p.commute.destination ? `Over ${p.commute.maxMinutes} min to ${p.commute.destination}.` : "Set a commute destination first."}
          disabled={!p.commute.destination}
          checked={p.dealbreakers.commuteOverLimit}
          onChange={set("commuteOverLimit")}
        />
      </div>
      <div className="mt-6">
        <Field label="Anything else the group should know?" hint="Shown to everyone alongside each flat. Not checked automatically.">
          <textarea value={p.otherConstraints} maxLength={500} rows={3} onChange={(e) => update((d) => void (d.otherConstraints = e.target.value))} placeholder="e.g. I work night shifts, so a quiet street matters." className={cn(inputClass, "h-auto py-3")} />
        </Field>
      </div>
    </>
  );
}

function StepPreferences({ p, update }: StepProps) {
  return (
    <>
      <StepHeader title="What would you like?">
        Preferences are negotiable. They shape the score and show up as compromises when a flat doesn&apos;t have them.
      </StepHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => {
          const locked = p[f.key] === "must" || p.dealbreakers[f.dealbreaker];
          return (
            <ToggleCard
              key={f.key}
              title={f.title}
              description={locked ? "Already a requirement." : f.blurb}
              disabled={locked}
              checked={p[f.key] === "nice"}
              onChange={(on) => update((d) => void (d[f.key] = on ? "nice" : "none"))}
            />
          );
        })}
        <ToggleCard
          title="Bathrooms"
          description={p.bathrooms.importance === "must" ? "Already a requirement." : "More bathrooms would be nice."}
          disabled={p.bathrooms.importance === "must"}
          checked={p.bathrooms.importance === "nice"}
          onChange={(on) => update((d) => void (d.bathrooms.importance = on ? "nice" : "none"))}
        >
          <BathroomPicker p={p} update={update} />
        </ToggleCard>
        <ToggleCard
          title="Furnishing"
          description={p.furnishing.importance === "must" ? "Already a requirement." : "A furnishing level you'd prefer."}
          disabled={p.furnishing.importance === "must"}
          checked={p.furnishing.importance === "nice"}
          onChange={(on) => update((d) => void (d.furnishing.importance = on ? "nice" : "none"))}
        >
          <FurnishingPicker p={p} update={update} />
        </ToggleCard>
      </div>
      <div className="mt-6">
        <Field label="Nice-to-have amenities">
          <TagInput label="Nice-to-have amenities" value={p.amenities.nice} onChange={(v) => update((d) => void (d.amenities.nice = v))} suggestions={AMENITY_SUGGESTIONS} placeholder="e.g. balcony" />
        </Field>
      </div>
    </>
  );
}

function BathroomPicker({ p, update }: StepProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted">At least</span>
      <select value={p.bathrooms.min} onChange={(e) => update((d) => void (d.bathrooms.min = Number(e.target.value)))} className="rounded-xl border border-line bg-surface px-3 py-1.5">
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>
  );
}

function FurnishingPicker({ p, update }: StepProps) {
  return (
    <select value={p.furnishing.type} onChange={(e) => update((d) => void (d.furnishing.type = e.target.value as Furnishing))} className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm">
      <option value="furnished">Furnished</option>
      <option value="semi-furnished">Semi-furnished (or better)</option>
      <option value="unfurnished">Unfurnished</option>
    </select>
  );
}

function StepReview({ p, name }: { p: Preferences; name: string }) {
  const { dealbreakers, musts, prefs } = describePreferences(p);
  return (
    <>
      <StepHeader title={`Check your list, ${name}`}>
        This is exactly how every flat will be judged for you. Once the group locks preferences, nobody can change theirs
        without reopening for everyone.
      </StepHeader>
      <div className="space-y-4">
        <ReviewGroup title="Dealbreakers" subtitle="No-go" items={dealbreakers} tone="bad" />
        <ReviewGroup title="Must-haves" subtitle="Need" items={musts} tone="ink" />
        <ReviewGroup title="Preferences" subtitle="Would like" items={prefs} tone="accent" />
        {p.otherConstraints && (
          <div className="rounded-2xl border border-line p-4 text-sm">
            <p className="font-medium">Note for the group</p>
            <p className="mt-1 text-muted">{p.otherConstraints}</p>
          </div>
        )}
      </div>
    </>
  );
}

function ReviewGroup({ title, subtitle, items, tone }: { title: string; subtitle: string; items: string[]; tone: "bad" | "ink" | "accent" }) {
  const dot = tone === "bad" ? "bg-bad" : tone === "accent" ? "bg-accent" : "bg-ink";
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-sm font-medium">
        {title} <span className="font-normal text-muted">· {subtitle}</span>
      </p>
      {items.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {items.map((i) => (
            <li key={i} className="flex items-center gap-2 rounded-full bg-canvas px-3 py-1 text-sm">
              <span className={cn("size-1.5 rounded-full", dot)} />
              {i}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted">None</p>
      )}
    </div>
  );
}
