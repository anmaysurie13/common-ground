// Deterministic matching engine. No network, no randomness, no AI:
// the same listings and preferences always produce the same result.
//
// Hierarchy
//   A. Dealbreakers  – any violation => "Does not work for X", excluded from the shortlist
//   B. Must-haves    – tracked individually; any unmet must-have also excludes the listing
//   C. Preferences   – weighted, negotiable; drive the score and the list of compromises
//   D. Group match   – average of individual scores

import { MATCH_CONFIG, type MatchConfig } from "./config";
import type { Furnishing, Importance, Listing, Preferences } from "../types";

export type CheckKind = "dealbreaker" | "must" | "preference";
export type CheckState = "met" | "compromise" | "unmet" | "unknown";

export interface Check {
  key: string;
  kind: CheckKind;
  state: CheckState;
  /** Short phrase for chips, phrased for the current state. */
  label: string;
  /** Longer, factual explanation. */
  detail: string;
  /** Preferences only: relative weight and 0..1 satisfaction. */
  weight?: number;
  score?: number;
}

export type PersonStatus = "works" | "missing_must" | "dealbreaker";

export interface ScoreBreakdown {
  mustPoints: number;
  mustMax: number;
  preferencePoints: number;
  preferenceMax: number;
  penalty: number;
  total: number;
}

export interface PersonEvaluation {
  memberId: string;
  name: string;
  status: PersonStatus;
  score: number;
  breakdown: ScoreBreakdown;
  checks: Check[];
  gets: string[];
  givesUp: string[];
  unknowns: string[];
  otherConstraints: string;
}

export interface ListingEvaluation {
  listingId: string;
  viable: boolean;
  groupScore: number;
  minScore: number;
  rentShare: number;
  people: PersonEvaluation[];
  /** Why it isn't viable, e.g. "Does not work for Meera: no lift". */
  blockers: string[];
  /** Group-level observations worth discussing. */
  tradeoffs: string[];
}

export interface EvaluatedMember {
  id: string;
  name: string;
  preferences: Preferences;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const norm = (s: string) => s.trim().toLowerCase();

export function areaMatches(listingArea: string, candidate: string): boolean {
  const a = norm(listingArea);
  const b = norm(candidate);
  return b.length > 0 && (a === b || a.includes(b));
}

const FURNISHING_RANK: Record<Furnishing, number> = {
  unfurnished: 0,
  "semi-furnished": 1,
  furnished: 2,
};

function furnishingSatisfies(listing: Furnishing, wanted: Furnishing): boolean {
  // Someone who wants unfurnished (bringing their own furniture) wants exactly that.
  if (wanted === "unfurnished") return listing === "unfurnished";
  return FURNISHING_RANK[listing] >= FURNISHING_RANK[wanted];
}

function amenityPresent(listing: Listing, amenity: string): boolean {
  const needle = norm(amenity);
  if (!needle) return true;
  return listing.amenities.some((a) => norm(a).includes(needle) || needle.includes(norm(a)));
}

/** Adds a check for a boolean feature at the right level of the hierarchy. */
function featureCheck(
  checks: Check[],
  key: string,
  name: string,
  present: boolean,
  importance: Importance,
  isDealbreaker: boolean,
  weight: number,
  missingLabel = `No ${name.toLowerCase()}`,
) {
  if (isDealbreaker) {
    checks.push({
      key,
      kind: "dealbreaker",
      state: present ? "met" : "unmet",
      label: present ? name : missingLabel,
      detail: present
        ? `Has ${name.toLowerCase()} — required, marked as a dealbreaker.`
        : `No ${name.toLowerCase()}, which was marked as a dealbreaker.`,
    });
  } else if (importance === "must") {
    checks.push({
      key,
      kind: "must",
      state: present ? "met" : "unmet",
      label: present ? name : missingLabel,
      detail: present ? `Has ${name.toLowerCase()} (must-have).` : `Missing ${name.toLowerCase()} (must-have).`,
    });
  } else if (importance === "nice") {
    checks.push({
      key,
      kind: "preference",
      state: present ? "met" : "compromise",
      label: present ? name : missingLabel,
      detail: present
        ? `Has ${name.toLowerCase()} (would like).`
        : `No ${name.toLowerCase()} — a preference, not a requirement.`,
      weight,
      score: present ? 1 : 0,
    });
  }
}

export function evaluatePerson(
  listing: Listing,
  member: EvaluatedMember,
  groupSize: number,
  config: MatchConfig = MATCH_CONFIG,
): PersonEvaluation {
  const p = member.preferences;
  const w = config.preferenceWeights;
  const checks: Check[] = [];
  const share = listing.rent / groupSize;

  // --- Budget: over max is always a dealbreaker; above ideal is a compromise.
  const overMax = share > p.budget.max;
  checks.push({
    key: "budget",
    kind: "dealbreaker",
    state: overMax ? "unmet" : "met",
    label: overMax ? `Over max budget` : "Within budget",
    detail: overMax
      ? `Rent share ${inr(share)} is above the ${inr(p.budget.max)} maximum.`
      : `Rent share ${inr(share)} is within the ${inr(p.budget.max)} maximum.`,
  });
  if (!overMax) {
    const ideal = Math.min(p.budget.ideal, p.budget.max);
    if (share <= ideal) {
      checks.push({
        key: "rent",
        kind: "preference",
        state: "met",
        label: "At or under ideal rent",
        detail: `Rent share ${inr(share)} is at or under the ideal ${inr(ideal)}.`,
        weight: w.rent,
        score: 1,
      });
    } else {
      const span = Math.max(p.budget.max - ideal, 1);
      const score = 1 - (1 - config.rentFloorAtMax) * ((share - ideal) / span);
      checks.push({
        key: "rent",
        kind: "preference",
        state: "compromise",
        label: `Pays ${inr(share - ideal)} over ideal`,
        detail: `Rent share ${inr(share)} is ${inr(share - ideal)} above the ideal ${inr(ideal)} (still under max).`,
        weight: w.rent,
        score,
      });
    }
  }

  // --- Areas
  if (p.areas.excluded.length > 0) {
    const hit = p.areas.excluded.find((a) => areaMatches(listing.area, a));
    checks.push({
      key: "excluded-area",
      kind: "dealbreaker",
      state: hit ? "unmet" : "met",
      label: hit ? `In ruled-out area (${listing.area})` : "Not in a ruled-out area",
      detail: hit
        ? `${listing.area} is on the list of areas that won't be considered.`
        : `${listing.area} isn't on the list of ruled-out areas.`,
    });
  }
  if (p.areas.preferred.length > 0) {
    const inPreferred = p.areas.preferred.some((a) => areaMatches(listing.area, a));
    checks.push({
      key: "area",
      kind: "preference",
      state: inPreferred ? "met" : "compromise",
      label: inPreferred ? `Preferred area (${listing.area})` : "Not a preferred area",
      detail: inPreferred
        ? `${listing.area} is a preferred area.`
        : `${listing.area} isn't among the preferred areas (${p.areas.preferred.join(", ")}).`,
      weight: w.area,
      score: inPreferred ? 1 : 0,
    });
  }

  // --- Commute
  if (p.commute.importance !== "none" || p.dealbreakers.commuteOverLimit) {
    const minutes = listing.commutes[member.id];
    const dest = p.commute.destination || "commute destination";
    const limit = p.commute.maxMinutes;
    const kind: CheckKind = p.dealbreakers.commuteOverLimit
      ? "dealbreaker"
      : p.commute.importance === "must"
        ? "must"
        : "preference";
    if (minutes === undefined || minutes === null || Number.isNaN(minutes)) {
      checks.push({
        key: "commute",
        kind,
        state: "unknown",
        label: "Commute unknown",
        detail: `No commute time to ${dest} was entered for this listing — check before visiting.`,
      });
    } else if (minutes <= limit) {
      checks.push({
        key: "commute",
        kind,
        state: "met",
        label: `${minutes} min to ${dest}`,
        detail: `About ${minutes} min to ${dest}, within the ${limit} min limit.`,
        ...(kind === "preference" ? { weight: w.commute, score: 1 } : {}),
      });
    } else if (kind === "preference") {
      const zeroAt = limit * config.commuteZeroAt;
      const score = Math.max(0, 1 - (minutes - limit) / Math.max(zeroAt - limit, 1));
      checks.push({
        key: "commute",
        kind,
        state: "compromise",
        label: `Longer commute (${minutes} min)`,
        detail: `About ${minutes} min to ${dest}, over the preferred ${limit} min.`,
        weight: w.commute,
        score,
      });
    } else {
      checks.push({
        key: "commute",
        kind,
        state: "unmet",
        label: `Commute ${minutes} min (limit ${limit})`,
        detail: `About ${minutes} min to ${dest}, over the ${limit} min limit.`,
      });
    }
  }

  // --- Features
  featureCheck(checks, "lift", "Lift", listing.lift, p.lift, p.dealbreakers.noLift, w.lift);
  featureCheck(checks, "parking", "Parking", listing.parking, p.parking, p.dealbreakers.noParking, w.parking);
  featureCheck(
    checks,
    "pets",
    "Pet-friendly",
    listing.petFriendly,
    p.petFriendly,
    p.dealbreakers.notPetFriendly,
    w.petFriendly,
    "Not pet-friendly",
  );

  if (p.dealbreakers.groundFloor) {
    const ground = listing.floor === 0;
    checks.push({
      key: "ground-floor",
      kind: "dealbreaker",
      state: ground ? "unmet" : "met",
      label: ground ? "Ground floor" : "Not ground floor",
      detail: ground ? "Ground-floor flat, which was ruled out." : `On floor ${listing.floor}, not the ground floor.`,
    });
  }

  if (p.bathrooms.importance !== "none") {
    const ok = listing.bathrooms >= p.bathrooms.min;
    const must = p.bathrooms.importance === "must";
    checks.push({
      key: "bathrooms",
      kind: must ? "must" : "preference",
      state: ok ? "met" : must ? "unmet" : "compromise",
      label: ok ? `${listing.bathrooms} bathrooms` : `Only ${listing.bathrooms} bathroom${listing.bathrooms === 1 ? "" : "s"}`,
      detail: ok
        ? `${listing.bathrooms} bathrooms (wanted at least ${p.bathrooms.min}).`
        : `${listing.bathrooms} bathroom${listing.bathrooms === 1 ? "" : "s"}; wanted at least ${p.bathrooms.min}.`,
      ...(must ? {} : { weight: w.bathrooms, score: ok ? 1 : 0 }),
    });
  }

  if (p.furnishing.importance !== "none") {
    const ok = furnishingSatisfies(listing.furnishing, p.furnishing.type);
    const must = p.furnishing.importance === "must";
    checks.push({
      key: "furnishing",
      kind: must ? "must" : "preference",
      state: ok ? "met" : must ? "unmet" : "compromise",
      label: ok ? capitalise(listing.furnishing) : `${capitalise(listing.furnishing)}, not ${p.furnishing.type}`,
      detail: ok
        ? `${capitalise(listing.furnishing)} (wanted ${p.furnishing.type}).`
        : `Listed as ${listing.furnishing}; wanted ${p.furnishing.type}.`,
      ...(must ? {} : { weight: w.furnishing, score: ok ? 1 : 0 }),
    });
  }

  for (const amenity of p.amenities.must) {
    const ok = amenityPresent(listing, amenity);
    checks.push({
      key: `amenity-must-${norm(amenity)}`,
      kind: "must",
      state: ok ? "met" : "unmet",
      label: ok ? capitalise(amenity) : `No ${amenity.toLowerCase()}`,
      detail: ok ? `Listing mentions ${amenity} (must-have).` : `Listing doesn't mention ${amenity} (must-have).`,
    });
  }
  for (const amenity of p.amenities.nice) {
    const ok = amenityPresent(listing, amenity);
    checks.push({
      key: `amenity-nice-${norm(amenity)}`,
      kind: "preference",
      state: ok ? "met" : "compromise",
      label: ok ? capitalise(amenity) : `No ${amenity.toLowerCase()}`,
      detail: ok ? `Listing mentions ${amenity}.` : `Listing doesn't mention ${amenity} (nice to have).`,
      weight: w.amenity,
      score: ok ? 1 : 0,
    });
  }

  return summarisePerson(member, checks, p.otherConstraints, config);
}

function summarisePerson(
  member: EvaluatedMember,
  checks: Check[],
  otherConstraints: string,
  config: MatchConfig,
): PersonEvaluation {
  const known = checks.filter((c) => c.state !== "unknown");
  const musts = known.filter((c) => c.kind === "must");
  const prefs = known.filter((c) => c.kind === "preference");

  const mustRatio = musts.length ? musts.filter((c) => c.state === "met").length / musts.length : 1;
  const totalWeight = prefs.reduce((s, c) => s + (c.weight ?? 0), 0);
  const prefRatio = totalWeight
    ? prefs.reduce((s, c) => s + (c.weight ?? 0) * (c.score ?? 0), 0) / totalWeight
    : 1;
  const compromises = prefs.filter((c) => c.state === "compromise").length;

  const mustPoints = config.split.mustHaves * mustRatio;
  const preferencePoints = config.split.preferences * prefRatio;
  const penalty = compromises * config.compromisePenalty;
  const total = clamp(Math.round(mustPoints + preferencePoints - penalty), 0, 100);

  const status: PersonStatus = known.some((c) => c.kind === "dealbreaker" && c.state === "unmet")
    ? "dealbreaker"
    : musts.some((c) => c.state === "unmet")
      ? "missing_must"
      : "works";

  return {
    memberId: member.id,
    name: member.name,
    status,
    score: total,
    breakdown: {
      mustPoints: round1(mustPoints),
      mustMax: config.split.mustHaves,
      preferencePoints: round1(preferencePoints),
      preferenceMax: config.split.preferences,
      penalty,
      total,
    },
    checks,
    gets: checks.filter((c) => c.state === "met").map((c) => c.label),
    givesUp: checks.filter((c) => c.state === "compromise" || c.state === "unmet").map((c) => c.label),
    unknowns: checks.filter((c) => c.state === "unknown").map((c) => c.detail),
    otherConstraints,
  };
}

export function evaluateListing(
  listing: Listing,
  members: EvaluatedMember[],
  config: MatchConfig = MATCH_CONFIG,
): ListingEvaluation {
  const groupSize = Math.max(members.length, 1);
  const people = members.map((m) => evaluatePerson(listing, m, groupSize, config));

  const blockers: string[] = [];
  for (const person of people) {
    for (const c of person.checks) {
      if (c.state !== "unmet") continue;
      if (c.kind === "dealbreaker") blockers.push(`Does not work for ${person.name}: ${c.detail}`);
      else if (c.kind === "must") blockers.push(`Misses ${person.name}'s must-have: ${c.detail}`);
    }
  }

  const scores = people.map((p) => p.score);
  const groupScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const minScore = scores.length ? Math.min(...scores) : 0;
  const maxScore = scores.length ? Math.max(...scores) : 0;

  const viable = people.every((p) => p.status === "works");
  // Trade-off notes only matter for flats still on the table.
  const tradeoffs: string[] = [];
  if (viable && maxScore - minScore >= config.imbalanceThreshold) {
    const low = people.filter((p) => p.score === minScore).map((p) => p.name);
    tradeoffs.push(
      `Uneven fit: ${joinNames(low)} ${low.length > 1 ? "match" : "matches"} noticeably less well (${minScore} vs ${maxScore}).`,
    );
  }
  for (const person of viable ? people : []) {
    const compromises = person.checks.filter((c) => c.state === "compromise");
    if (compromises.length >= 3) {
      tradeoffs.push(`${person.name} gives up ${compromises.length} preferences here.`);
    }
  }
  const unknownCount = people.reduce((s, p) => s + p.unknowns.length, 0);
  if (unknownCount > 0) {
    tradeoffs.push(`${unknownCount} requirement${unknownCount > 1 ? "s" : ""} couldn't be checked from the listing data.`);
  }

  return {
    listingId: listing.id,
    viable,
    groupScore,
    minScore,
    rentShare: listing.rent / groupSize,
    people,
    blockers,
    tradeoffs,
  };
}

export interface MatchOutcome {
  /** Top viable options (at most config.shortlistSize). */
  shortlist: ListingEvaluation[];
  /** Viable but ranked below the shortlist. */
  moreViable: ListingEvaluation[];
  /** Not viable: at least one dealbreaker or missing must-have. */
  excluded: ListingEvaluation[];
  byId: Record<string, ListingEvaluation>;
}

export function matchListings(
  listings: Listing[],
  members: EvaluatedMember[],
  config: MatchConfig = MATCH_CONFIG,
): MatchOutcome {
  const evaluations = listings.map((l) => evaluateListing(l, members, config));
  const viable = evaluations
    .filter((e) => e.viable)
    .sort((a, b) => b.groupScore - a.groupScore || b.minScore - a.minScore || a.rentShare - b.rentShare);
  const excluded = evaluations
    .filter((e) => !e.viable)
    .sort((a, b) => a.blockers.length - b.blockers.length || b.groupScore - a.groupScore);

  return {
    shortlist: viable.slice(0, config.shortlistSize),
    moreViable: viable.slice(config.shortlistSize),
    excluded,
    byId: Object.fromEntries(evaluations.map((e) => [e.listingId, e])),
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
