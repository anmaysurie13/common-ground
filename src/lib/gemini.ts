import "server-only";
import { z } from "zod";
import type { ListingEvaluation } from "./matching/engine";
import type { Listing } from "./types";

// Gemini is an optional helper. It only (a) drafts structured preferences from free text,
// which the person reviews before saving, and (b) rewrites engine output in plain language.
// It never decides eligibility and never sees or changes scores it could "fix".

export const aiEnabled = Boolean(process.env.GEMINI_API_KEY);
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

async function generate(system: string, prompt: string, json: boolean): Promise<string | null> {
  if (!aiEnabled) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, ...(json ? { responseMimeType: "application/json" } : {}) },
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("Gemini request failed", res.status);
      return null;
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") || null;
  } catch (err) {
    console.error("Gemini request error", err);
    return null;
  }
}

const importance = z.enum(["must", "nice", "none"]);
/** Everything optional: the model only fills what the person actually said. */
export const draftPreferencesSchema = z
  .object({
    budget: z.object({ max: z.number().int().positive(), ideal: z.number().int().positive() }).partial(),
    areas: z.object({ preferred: z.array(z.string().max(60)), excluded: z.array(z.string().max(60)) }).partial(),
    commute: z
      .object({ destination: z.string().max(80), maxMinutes: z.number().int().min(1).max(300), importance })
      .partial(),
    lift: importance,
    parking: importance,
    petFriendly: importance,
    bathrooms: z.object({ min: z.number().int().min(1).max(6), importance }).partial(),
    furnishing: z.object({ type: z.enum(["furnished", "semi-furnished", "unfurnished"]), importance }).partial(),
    amenities: z.object({ must: z.array(z.string().max(60)), nice: z.array(z.string().max(60)) }).partial(),
    dealbreakers: z
      .object({
        noLift: z.boolean(),
        noParking: z.boolean(),
        notPetFriendly: z.boolean(),
        groundFloor: z.boolean(),
        commuteOverLimit: z.boolean(),
      })
      .partial(),
    otherConstraints: z.string().max(500),
  })
  .partial();

export type DraftPreferences = z.infer<typeof draftPreferencesSchema>;

export async function draftPreferencesFromText(text: string): Promise<DraftPreferences | null> {
  const system = `You convert a person's description of their flat-hunting needs into JSON.
Output ONLY fields the person clearly stated. Omit anything not mentioned. Never guess numbers.
Schema (all optional):
{
  "budget": {"max": int INR per month (their personal share), "ideal": int},
  "areas": {"preferred": [string], "excluded": [string]},
  "commute": {"destination": string, "maxMinutes": int, "importance": "must"|"nice"|"none"},
  "lift" | "parking" | "petFriendly": "must"|"nice"|"none",
  "bathrooms": {"min": int, "importance": "must"|"nice"|"none"},
  "furnishing": {"type": "furnished"|"semi-furnished"|"unfurnished", "importance": "must"|"nice"|"none"},
  "amenities": {"must": [string], "nice": [string]},
  "dealbreakers": {"noLift": bool, "noParking": bool, "notPetFriendly": bool, "groundFloor": bool, "commuteOverLimit": bool},
  "otherConstraints": string
}
Rules: "need/must/can't do without" => "must". "would like/prefer/ideally" => "nice".
"never/no way/deal breaker/won't consider" => the matching dealbreaker flag or excluded area.
Put anything that doesn't fit the schema into otherConstraints in one short sentence.`;
  const raw = await generate(system, text.slice(0, 2000), true);
  if (!raw) return null;
  try {
    const parsed = draftPreferencesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function explainInPlainLanguage(listing: Listing, e: ListingEvaluation): Promise<string | null> {
  const facts = {
    listing: {
      title: listing.title,
      area: listing.area,
      rent: listing.rent,
      rentSharePerPerson: Math.round(e.rentShare),
    },
    viable: e.viable,
    blockers: e.blockers,
    people: e.people.map((p) => ({
      name: p.name,
      status: p.status,
      score: p.score,
      checks: p.checks.map((c) => ({ kind: c.kind, state: c.state, detail: c.detail })),
    })),
  };
  const system = `You explain a flat's fit for a group of friends in 3-4 short, warm, neutral sentences.
Use ONLY the facts in the JSON. Do not add apartment details, prices or opinions not present.
Never recommend choosing or rejecting the flat, and never call anyone a winner or loser.
Never soften or reinterpret a "dealbreaker" or unmet "must": if viable is false, say plainly who it doesn't work for and why.
Refer to people by name only (no pronouns). Plain text, no markdown.`;
  const text = await generate(system, JSON.stringify(facts), false);
  return text?.trim() || null;
}
