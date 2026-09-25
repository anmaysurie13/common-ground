"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { repo } from "@/lib/db";
import { DEMO_GROUP_NAME, DEMO_LISTINGS, DEMO_MEMBERS } from "@/lib/demo";
import { draftPreferencesFromText, explainInPlainLanguage, type DraftPreferences } from "@/lib/gemini";
import { displayName, loadGroup, refreshMatchResults, runMatching } from "@/lib/group";
import { summariseEvaluation } from "@/lib/matching/summary";
import { generateCode, newSecret, rememberMembers } from "@/lib/session";
import type { FlagKind, ListingInput, Preferences } from "@/lib/types";
import { groupSchema, listingSchema, nameSchema, noteSchema, preferencesSchema } from "@/lib/validation";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

function firstIssue(err: { issues: { message: string }[] }) {
  return err.issues[0]?.message ?? "Please check the form.";
}

// ---------------------------------------------------------------- groups

export async function createGroupAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    creatorName: formData.get("creatorName"),
    size: formData.get("size"),
  });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const code = generateCode();
  const group = await repo.createGroup({ code, name: parsed.data.name, size: parsed.data.size, isDemo: false });
  const creator = newSecret();
  const members = await repo.createMembers(
    group.id,
    Array.from({ length: parsed.data.size }, (_, i) => ({
      slot: i + 1,
      name: i === 0 ? parsed.data.creatorName : null,
      // Unclaimed spots get a random hash nobody holds the secret for.
      secretHash: i === 0 ? creator.hash : newSecret().hash,
    })),
  );
  await rememberMembers(code, [{ memberId: members[0].id, secret: creator.secret }]);
  redirect(`/g/${code}?created=1`);
}

export async function createDemoAction(): Promise<void> {
  const code = generateCode();
  const group = await repo.createGroup({ code, name: DEMO_GROUP_NAME, size: 3, isDemo: true });
  const secrets = DEMO_MEMBERS.map(() => newSecret());
  const members = await repo.createMembers(
    group.id,
    DEMO_MEMBERS.map((m, i) => ({ slot: i + 1, name: m.name, secretHash: secrets[i].hash })),
  );
  for (const [i, m] of members.entries()) {
    await repo.savePreferences(m.id, group.id, DEMO_MEMBERS[i].preferences, true);
  }
  for (const { commuteBySlot, ...listing } of DEMO_LISTINGS) {
    const commutes = Object.fromEntries(
      Object.entries(commuteBySlot).map(([slot, minutes]) => [members[Number(slot)].id, minutes]),
    );
    await repo.createListing(group.id, "Riya", { ...listing, commutes });
  }
  // In the demo you can act as all three friends.
  await rememberMembers(
    code,
    members.map((m, i) => ({ memberId: m.id, secret: secrets[i].secret })),
  );
  redirect(`/g/${code}`);
}

export async function joinGroupAction(
  code: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) return fail(firstIssue(name.error));
  const ctx = await loadGroup(code);
  if (ctx.group.status === "locked") return fail("Preferences are locked for this group.");
  const open = ctx.members.find((m) => !m.name);
  if (!open) return fail("All spots in this group are taken.");
  if (ctx.members.some((m) => m.name?.toLowerCase() === name.data.toLowerCase())) {
    return fail("Someone in this group already uses that name.");
  }
  const { secret, hash } = newSecret();
  try {
    await repo.claimMember(open.id, name.data, hash);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Couldn't join the group.");
  }
  await rememberMembers(code, [{ memberId: open.id, secret }]);
  redirect(`/g/${code}/preferences?member=${open.id}`);
}

export async function lockGroupAction(code: string): Promise<ActionResult> {
  const ctx = await loadGroup(code);
  if (ctx.me.length === 0) return fail("Only group members can lock preferences.");
  if (!ctx.allSubmitted) return fail("Everyone needs to submit their preferences first.");
  await repo.setGroupStatus(ctx.group.id, "locked");
  await refreshMatchResults({ ...ctx.group, status: "locked" }, ctx.members);
  revalidatePath(`/g/${code}`, "layout");
  redirect(`/g/${code}/results`);
}

export async function unlockGroupAction(code: string): Promise<ActionResult> {
  const ctx = await loadGroup(code);
  if (ctx.me.length === 0) return fail("Only group members can reopen preferences.");
  await repo.setGroupStatus(ctx.group.id, "collecting");
  revalidatePath(`/g/${code}`, "layout");
  return { ok: true };
}

// ---------------------------------------------------------------- preferences

export async function savePreferencesAction(
  code: string,
  memberId: string,
  preferences: Preferences,
  submit: boolean,
): Promise<ActionResult> {
  const ctx = await loadGroup(code);
  if (!ctx.me.some((m) => m.id === memberId)) return fail("You can only edit your own preferences.");
  if (ctx.group.status === "locked") return fail("Preferences are locked. Reopen them from the group page first.");
  const parsed = preferencesSchema.safeParse(preferences);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  await repo.savePreferences(memberId, ctx.group.id, parsed.data, submit);
  revalidatePath(`/g/${code}`, "layout");
  return { ok: true };
}

export async function draftPreferencesAction(
  code: string,
  text: string,
): Promise<{ ok: true; draft: DraftPreferences } | { ok: false; error: string }> {
  const ctx = await loadGroup(code);
  if (ctx.me.length === 0) return { ok: false, error: "Join the group first." };
  const trimmed = String(text ?? "").trim();
  if (trimmed.length < 10) return { ok: false, error: "Write a sentence or two first." };
  const draft = await draftPreferencesFromText(trimmed);
  if (!draft) return { ok: false, error: "The AI helper isn't available right now — fill the form directly." };
  return { ok: true, draft };
}

// ---------------------------------------------------------------- listings

export async function addListingAction(
  code: string,
  input: ListingInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await loadGroup(code);
  const author = ctx.me[0];
  if (!author) return { ok: false, error: "Only group members can add listings." };
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  // Only keep commute entries for real members of this group.
  const memberIds = new Set(ctx.members.map((m) => m.id));
  const commutes = Object.fromEntries(Object.entries(parsed.data.commutes).filter(([id]) => memberIds.has(id)));
  const listing = await repo.createListing(ctx.group.id, displayName(author), { ...parsed.data, commutes });
  await refreshMatchResults(ctx.group, ctx.members);
  revalidatePath(`/g/${code}`, "layout");
  return { ok: true, id: listing.id };
}

export async function deleteListingAction(code: string, listingId: string): Promise<ActionResult> {
  const ctx = await loadGroup(code);
  if (ctx.me.length === 0) return fail("Only group members can remove listings.");
  await repo.deleteListing(ctx.group.id, listingId);
  await refreshMatchResults(ctx.group, ctx.members);
  revalidatePath(`/g/${code}`, "layout");
  return { ok: true };
}

// ---------------------------------------------------------------- discussion

export async function toggleFlagAction(
  code: string,
  listingId: string,
  memberId: string,
  kind: FlagKind,
  on: boolean,
): Promise<ActionResult> {
  const ctx = await loadGroup(code);
  if (!ctx.me.some((m) => m.id === memberId)) return fail("Not allowed.");
  if (kind !== "saved" && kind !== "discuss") return fail("Unknown flag.");
  const listings = await repo.listListings(ctx.group.id);
  if (!listings.some((l) => l.id === listingId)) return fail("Listing not found.");
  await repo.setFlag({ groupId: ctx.group.id, listingId, memberId, kind }, on);
  revalidatePath(`/g/${code}`, "layout");
  return { ok: true };
}

export async function addNoteAction(
  code: string,
  listingId: string,
  memberId: string,
  body: string,
): Promise<ActionResult> {
  const ctx = await loadGroup(code);
  const member = ctx.me.find((m) => m.id === memberId);
  if (!member) return fail("Not allowed.");
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return fail("Notes need 1–1000 characters.");
  const listings = await repo.listListings(ctx.group.id);
  if (!listings.some((l) => l.id === listingId)) return fail("Listing not found.");
  await repo.addNote({ groupId: ctx.group.id, listingId, memberId, authorName: displayName(member), body: parsed.data });
  revalidatePath(`/g/${code}`, "layout");
  return { ok: true };
}

export async function explainListingAction(
  code: string,
  listingId: string,
): Promise<{ ok: true; text: string; source: "ai" | "rules" } | { ok: false; error: string }> {
  const ctx = await loadGroup(code);
  if (ctx.me.length === 0) return { ok: false, error: "Join the group first." };
  if (!ctx.allSubmitted) return { ok: false, error: "Everyone needs to submit preferences first." };
  const listings = await repo.listListings(ctx.group.id);
  const listing = listings.find((l) => l.id === listingId);
  if (!listing) return { ok: false, error: "Listing not found." };
  const evaluation = runMatching(ctx.members, [listing]).byId[listing.id];
  const ai = await explainInPlainLanguage(listing, evaluation);
  return ai ? { ok: true, text: ai, source: "ai" } : { ok: true, text: summariseEvaluation(evaluation), source: "rules" };
}
