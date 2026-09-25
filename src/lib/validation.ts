import { z } from "zod";
import type { Preferences } from "./types";

const importance = z.enum(["must", "nice", "none"]);
const furnishing = z.enum(["furnished", "semi-furnished", "unfurnished"]);
const shortText = z.string().trim().max(60);
const tagList = z.array(shortText.min(1)).max(20);
const money = z.coerce.number().int().min(0).max(10_000_000);

export const preferencesSchema = z
  .object({
    budget: z.object({ max: money.min(1), ideal: money }),
    areas: z.object({ preferred: tagList, excluded: tagList }),
    commute: z.object({
      destination: z.string().trim().max(80),
      maxMinutes: z.coerce.number().int().min(1).max(300),
      importance,
    }),
    lift: importance,
    parking: importance,
    petFriendly: importance,
    bathrooms: z.object({ min: z.coerce.number().int().min(1).max(6), importance }),
    furnishing: z.object({ type: furnishing, importance }),
    amenities: z.object({ must: tagList, nice: tagList }),
    dealbreakers: z.object({
      noLift: z.boolean(),
      noParking: z.boolean(),
      notPetFriendly: z.boolean(),
      groundFloor: z.boolean(),
      commuteOverLimit: z.boolean(),
    }),
    otherConstraints: z.string().trim().max(500),
  })
  .refine((p) => p.budget.ideal <= p.budget.max, {
    message: "Ideal rent can't be higher than your maximum.",
    path: ["budget", "ideal"],
  })
  .refine((p) => !(p.commute.importance !== "none" || p.dealbreakers.commuteOverLimit) || p.commute.destination, {
    message: "Tell us where you commute to.",
    path: ["commute", "destination"],
  });

export const listingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  area: z.string().trim().min(2).max(60),
  rent: money.min(1000),
  bedrooms: z.coerce.number().int().min(1).max(10),
  bathrooms: z.coerce.number().int().min(1).max(10),
  floor: z.coerce.number().int().min(0).max(100),
  lift: z.boolean(),
  parking: z.boolean(),
  petFriendly: z.boolean(),
  furnishing,
  commutes: z.record(z.string(), z.coerce.number().int().min(0).max(600)),
  locationNotes: z.string().trim().max(300),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((u) => u === "" || /^https?:\/\//i.test(u), "Use a full http(s) link."),
  description: z.string().trim().max(2000),
  images: z.array(z.string().trim().url().max(500).refine((u) => /^https?:\/\//i.test(u))).max(8),
  amenities: tagList,
});

export const groupSchema = z.object({
  name: z.string().trim().min(2, "Give your group a name.").max(60),
  creatorName: z.string().trim().min(1, "Add your name.").max(40),
  size: z.coerce.number().int().min(2).max(4),
});

export const nameSchema = z.string().trim().min(1, "Add your name.").max(40);
export const noteSchema = z.string().trim().min(1).max(1000);

export const EMPTY_PREFERENCES: Preferences = {
  budget: { max: 15000, ideal: 13000 },
  areas: { preferred: [], excluded: [] },
  commute: { destination: "", maxMinutes: 40, importance: "none" },
  lift: "none",
  parking: "none",
  petFriendly: "none",
  bathrooms: { min: 2, importance: "none" },
  furnishing: { type: "semi-furnished", importance: "none" },
  amenities: { must: [], nice: [] },
  dealbreakers: {
    noLift: false,
    noParking: false,
    notPetFriendly: false,
    groundFloor: false,
    commuteOverLimit: false,
  },
  otherConstraints: "",
};
