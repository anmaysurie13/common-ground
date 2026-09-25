"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addListingAction } from "@/app/actions";
import { NumberInput, TagInput } from "@/components/form-controls";
import { Button, Card, ErrorNote, Field, cn, inputClass } from "@/components/ui";
import type { Furnishing, ListingInput } from "@/lib/types";

export interface CommuteTarget {
  memberId: string;
  name: string;
  destination: string;
}

const EMPTY: ListingInput = {
  title: "",
  area: "",
  rent: NaN,
  bedrooms: 3,
  bathrooms: 2,
  floor: 1,
  lift: false,
  parking: false,
  petFriendly: false,
  furnishing: "semi-furnished",
  commutes: {},
  locationNotes: "",
  url: "",
  description: "",
  images: [],
  amenities: [],
};

export function ListingForm({ code, commuteTargets }: { code: string; commuteTargets: CommuteTarget[] }) {
  const router = useRouter();
  const [l, setL] = useState<ListingInput>(EMPTY);
  const [imagesText, setImagesText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ListingInput>(k: K, v: ListingInput[K]) => setL((prev) => ({ ...prev, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const images = imagesText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const commutes = Object.fromEntries(Object.entries(l.commutes).filter(([, v]) => Number.isFinite(v)));
    start(async () => {
      const r = await addListingAction(code, { ...l, images, commutes });
      if (!r.ok) return setError(r.error);
      router.push(`/g/${code}/listings/${r.id}`);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="space-y-5 p-6 sm:p-8">
        <h3 className="font-semibold">Basics</h3>
        <Field label="Title">
          <input required minLength={3} maxLength={120} value={l.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Bright 3BHK near Baner Road" className={inputClass} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Area">
            <input required maxLength={60} value={l.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Baner" className={inputClass} />
          </Field>
          <Field label="Total monthly rent" hint="Split evenly for each person's share.">
            <NumberInput label="Total monthly rent" prefix="₹" step={500} min={0} value={l.rent} onChange={(v) => set("rent", v)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          <Field label="Bedrooms">
            <NumberInput label="Bedrooms" min={1} max={10} value={l.bedrooms} onChange={(v) => set("bedrooms", v)} />
          </Field>
          <Field label="Bathrooms">
            <NumberInput label="Bathrooms" min={1} max={10} value={l.bathrooms} onChange={(v) => set("bathrooms", v)} />
          </Field>
          <Field label="Floor" hint="0 = ground">
            <NumberInput label="Floor" min={0} max={100} value={l.floor} onChange={(v) => set("floor", v)} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <YesNo label="Lift" value={l.lift} onChange={(v) => set("lift", v)} />
          <YesNo label="Parking" value={l.parking} onChange={(v) => set("parking", v)} />
          <YesNo label="Pet-friendly" value={l.petFriendly} onChange={(v) => set("petFriendly", v)} />
        </div>
        <Field label="Furnishing">
          <select value={l.furnishing} onChange={(e) => set("furnishing", e.target.value as Furnishing)} className={inputClass}>
            <option value="furnished">Furnished</option>
            <option value="semi-furnished">Semi-furnished</option>
            <option value="unfurnished">Unfurnished</option>
          </select>
        </Field>
      </Card>

      <Card className="space-y-5 p-6 sm:p-8">
        <div>
          <h3 className="font-semibold">Commute</h3>
          <p className="mt-1 text-sm text-muted">
            Approximate door-to-door minutes at a normal commute time. Leave blank if you don&apos;t know — it&apos;ll be
            flagged to check, never guessed.
          </p>
        </div>
        {commuteTargets.length === 0 ? (
          <p className="text-sm text-muted">Nobody in the group has set a commute constraint yet.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {commuteTargets.map((t) => (
              <Field key={t.memberId} label={`${t.name} → ${t.destination}`}>
                <NumberInput
                  label={`Commute minutes for ${t.name}`}
                  suffix="min"
                  min={0}
                  max={600}
                  value={l.commutes[t.memberId] ?? NaN}
                  onChange={(v) => set("commutes", { ...l.commutes, [t.memberId]: v })}
                />
              </Field>
            ))}
          </div>
        )}
        <Field label="Location notes">
          <input maxLength={300} value={l.locationNotes} onChange={(e) => set("locationNotes", e.target.value)} placeholder="e.g. 5 min walk to the metro" className={inputClass} />
        </Field>
      </Card>

      <Card className="space-y-5 p-6 sm:p-8">
        <h3 className="font-semibold">Details</h3>
        <Field label="Amenities" hint="Used to check must-have and nice-to-have amenities.">
          <TagInput label="Amenities" value={l.amenities} onChange={(v) => set("amenities", v)} suggestions={["gym", "balcony", "power backup", "24x7 security", "pool", "garden"]} placeholder="Type and press Enter" />
        </Field>
        <Field label="Description">
          <textarea maxLength={2000} rows={4} value={l.description} onChange={(e) => set("description", e.target.value)} className={cn(inputClass, "h-auto py-3")} />
        </Field>
        <Field label="Listing link">
          <input type="url" maxLength={500} value={l.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" className={inputClass} />
        </Field>
        <Field label="Image links" hint="Optional. Paste one or more image URLs, separated by spaces or new lines.">
          <textarea rows={2} value={imagesText} onChange={(e) => setImagesText(e.target.value)} className={cn(inputClass, "h-auto py-3 font-mono text-xs")} />
        </Field>
      </Card>

      <ErrorNote>{error}</ErrorNote>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add listing"}
        </Button>
      </div>
    </form>
  );
}

function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line px-4 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex rounded-full bg-ink/5 p-0.5" role="radiogroup" aria-label={label}>
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium transition", value === v ? "bg-surface shadow-sm" : "text-muted")}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}
