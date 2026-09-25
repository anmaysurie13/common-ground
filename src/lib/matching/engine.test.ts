import { describe, expect, it } from "vitest";
import { DEMO_LISTINGS, DEMO_MEMBERS } from "../demo";
import type { Listing } from "../types";
import { evaluateListing, matchListings, type EvaluatedMember } from "./engine";

const members: EvaluatedMember[] = DEMO_MEMBERS.map((m, i) => ({ id: `m${i}`, ...m }));
const listings: Listing[] = DEMO_LISTINGS.map(({ commuteBySlot, ...l }, i) => ({
  ...l,
  id: `l${i}`,
  groupId: "g",
  addedBy: "Riya",
  createdAt: "2026-01-01T00:00:00Z",
  commutes: Object.fromEntries(Object.entries(commuteBySlot).map(([slot, min]) => [`m${slot}`, min])),
}));
const byArea = (area: string) => listings.find((l) => l.area === area)!;

describe("demo scenario", () => {
  const outcome = matchListings(listings, members);

  it("surfaces exactly the three viable flats", () => {
    expect(outcome.shortlist.map((e) => byId(e.listingId).area).sort()).toEqual(["Aundh", "Baner", "Bavdhan"]);
  });

  it("excludes the no-lift Kothrud flat for Meera and the long commute for Kavita", () => {
    const e = outcome.byId[byArea("Kothrud").id];
    expect(e.viable).toBe(false);
    expect(e.people.find((p) => p.name === "Meera")!.status).toBe("dealbreaker");
    expect(e.people.find((p) => p.name === "Kavita")!.status).toBe("dealbreaker");
    expect(e.people.find((p) => p.name === "Riya")!.status).toBe("works");
  });

  it("treats Riya's commute as a must-have, not a dealbreaker", () => {
    const e = outcome.byId[byArea("Wakad").id];
    expect(e.people.find((p) => p.name === "Riya")!.status).toBe("missing_must");
    expect(e.blockers).toHaveLength(1);
  });

  it("rules out the over-budget flat for everyone", () => {
    const e = outcome.byId[byArea("Balewadi").id];
    expect(e.people.every((p) => p.status === "dealbreaker")).toBe(true);
  });

  it("records genuine compromises on viable flats", () => {
    const aundh = outcome.byId[byArea("Aundh").id];
    const riya = aundh.people.find((p) => p.name === "Riya")!;
    expect(riya.givesUp).toContain("No parking");
    expect(riya.givesUp).toContain("Not a preferred area");
  });

  function byId(id: string) {
    return listings.find((l) => l.id === id)!;
  }
});

describe("scoring", () => {
  it("is deterministic", () => {
    const a = evaluateListing(listings[0], members);
    const b = evaluateListing(listings[0], members);
    expect(a).toEqual(b);
  });

  it("marks missing commute data as unknown instead of guessing", () => {
    const e = evaluateListing({ ...listings[0], commutes: {} }, members);
    const kavita = e.people.find((p) => p.name === "Kavita")!;
    expect(kavita.checks.find((c) => c.key === "commute")!.state).toBe("unknown");
    expect(kavita.status).toBe("works");
  });

  it("keeps scores within 0..100", () => {
    for (const l of listings) {
      for (const p of evaluateListing(l, members).people) {
        expect(p.score).toBeGreaterThanOrEqual(0);
        expect(p.score).toBeLessThanOrEqual(100);
      }
    }
  });
});
