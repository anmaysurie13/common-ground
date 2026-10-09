import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { repo } from "./db";
import { matchListings, type EvaluatedMember, type MatchOutcome } from "./matching/engine";
import { controlledMemberIds } from "./session";
import type { Group, Listing, Member, MemberRecord } from "./types";

export interface GroupContext {
  group: Group;
  members: Member[];
  /** Members the current browser can act as. */
  me: Member[];
  allSubmitted: boolean;
}

const strip = (record: MemberRecord): Member => {
  const { secretHash, ...m } = record;
  void secretHash;
  return m;
};

export async function loadGroup(code: string): Promise<GroupContext & { records: MemberRecord[] }> {
  if (!/^[A-Za-z0-9]{8,32}$/.test(code)) notFound();
  const group = await repo.getGroupByCode(code);
  if (!group) notFound();
  const records = await repo.listMembers(group.id);
  const controlled = await controlledMemberIds(code, records);
  const members = records.map(strip);
  return {
    group,
    records,
    members,
    me: members.filter((m) => controlled.has(m.id)),
    allSubmitted: members.length === group.size && members.every((m) => m.submittedAt && m.preferences),
  };
}

/**
 * Per-request memoised loadGroup for pages and layouts, so the layout and page share one fetch.
 * Server actions use the uncached loadGroup so they always read fresh state.
 */
export const loadGroupForRender = cache(loadGroup);

export function evaluatedMembers(members: Member[]): EvaluatedMember[] {
  return members
    .filter((m) => m.preferences && m.submittedAt)
    .map((m) => ({ id: m.id, name: m.name ?? `Person ${m.slot}`, preferences: m.preferences! }));
}

/** Runs the deterministic engine server-side. Scores are never accepted from the client. */
export function runMatching(members: Member[], listings: Listing[]): MatchOutcome {
  return matchListings(listings, evaluatedMembers(members));
}

/** Recomputes and stores match results for a locked group. */
export async function refreshMatchResults(group: Group, members: Member[]) {
  if (group.status !== "locked") return;
  const listings = await repo.listListings(group.id);
  const outcome = runMatching(members, listings);
  await repo.saveMatchResults(
    group.id,
    Object.values(outcome.byId).map((e) => ({
      listingId: e.listingId,
      viable: e.viable,
      groupScore: e.groupScore,
      evaluation: e,
    })),
  );
}

export function displayName(m: Member) {
  return m.name ?? `Person ${m.slot}`;
}
