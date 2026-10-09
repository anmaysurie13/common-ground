import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Group, Listing, ListingFlag, ListingInput, ListingNote, MemberRecord, Preferences } from "../types";
import type { Repo } from "./repo";

// All database access happens on the server with the service-role key.
// Every table has RLS enabled with no anon/authenticated policies (see supabase/schema.sql),
// so the public anon key can't read or write anything even if it leaks.

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Database error: ${res.error.message}`);
  return res.data;
}

type Row = Record<string, unknown>;

const toGroup = (r: Row): Group => ({
  id: r.id as string,
  code: r.code as string,
  name: r.name as string,
  size: r.size as number,
  status: r.status as Group["status"],
  isDemo: r.is_demo as boolean,
  lockedAt: (r.locked_at as string) ?? null,
  createdAt: r.created_at as string,
});

const toMember = (r: Row): MemberRecord => {
  const prefs = r.preferences as Row[] | Row | null;
  const prefRow = Array.isArray(prefs) ? prefs[0] : prefs;
  return {
    id: r.id as string,
    groupId: r.group_id as string,
    slot: r.slot as number,
    name: (r.name as string) ?? null,
    secretHash: r.secret_hash as string,
    submittedAt: (r.submitted_at as string) ?? null,
    preferences: (prefRow?.data as Preferences) ?? null,
  };
};

const toListing = (r: Row): Listing => ({
  id: r.id as string,
  groupId: r.group_id as string,
  title: r.title as string,
  area: r.area as string,
  rent: r.rent as number,
  bedrooms: r.bedrooms as number,
  bathrooms: r.bathrooms as number,
  floor: r.floor as number,
  lift: r.has_lift as boolean,
  parking: r.has_parking as boolean,
  petFriendly: r.pet_friendly as boolean,
  furnishing: r.furnishing as Listing["furnishing"],
  commutes: (r.commutes as Record<string, number>) ?? {},
  locationNotes: (r.location_notes as string) ?? "",
  url: (r.url as string) ?? "",
  description: (r.description as string) ?? "",
  images: (r.images as string[]) ?? [],
  amenities: (r.amenities as string[]) ?? [],
  addedBy: (r.added_by as string) ?? "",
  createdAt: r.created_at as string,
});

const toListingRow = (groupId: string, addedBy: string, l: ListingInput) => ({
  group_id: groupId,
  added_by: addedBy,
  title: l.title,
  area: l.area,
  rent: l.rent,
  bedrooms: l.bedrooms,
  bathrooms: l.bathrooms,
  floor: l.floor,
  has_lift: l.lift,
  has_parking: l.parking,
  pet_friendly: l.petFriendly,
  furnishing: l.furnishing,
  commutes: l.commutes,
  location_notes: l.locationNotes,
  url: l.url,
  description: l.description,
  images: l.images,
  amenities: l.amenities,
});

export const supabaseRepo: Repo = {
  kind: "supabase",

  async createGroup(input) {
    const row = check(
      await db()
        .from("groups")
        .insert({ code: input.code, name: input.name, size: input.size, is_demo: input.isDemo })
        .select()
        .single(),
    );
    return toGroup(row);
  },

  async getGroupByCode(code) {
    const row = check(await db().from("groups").select().eq("code", code).maybeSingle());
    return row ? toGroup(row) : null;
  },

  async setGroupStatus(groupId, status) {
    check(
      await db()
        .from("groups")
        .update({ status, locked_at: status === "locked" ? new Date().toISOString() : null })
        .eq("id", groupId),
    );
  },

  async createMembers(groupId, members) {
    const rows = check(
      await db()
        .from("group_members")
        .insert(members.map((m) => ({ group_id: groupId, slot: m.slot, name: m.name, secret_hash: m.secretHash })))
        .select(),
    );
    return (rows as Row[]).map(toMember);
  },

  async listMembers(groupId) {
    const rows = check(
      await db().from("group_members").select("*, preferences(data)").eq("group_id", groupId).order("slot"),
    );
    return (rows as Row[]).map(toMember);
  },

  async claimMember(memberId, name, secretHash) {
    // Only claim if still unclaimed — guards against two people racing for the same spot.
    const rows = check(
      await db()
        .from("group_members")
        .update({ name, secret_hash: secretHash })
        .eq("id", memberId)
        .is("name", null)
        .select("id"),
    );
    if (!rows || (rows as Row[]).length === 0) throw new Error("That spot has already been claimed.");
  },

  async savePreferences(memberId, groupId, preferences, submit) {
    check(
      await db()
        .from("preferences")
        .upsert({ member_id: memberId, group_id: groupId, data: preferences, updated_at: new Date().toISOString() }),
    );
    if (submit) {
      check(await db().from("group_members").update({ submitted_at: new Date().toISOString() }).eq("id", memberId));
    }
  },

  async createListing(groupId, addedBy, l) {
    const row = check(await db().from("listings").insert(toListingRow(groupId, addedBy, l)).select().single());
    return toListing(row);
  },

  async createListings(groupId, addedBy, inputs) {
    if (inputs.length === 0) return;
    check(await db().from("listings").insert(inputs.map((l) => toListingRow(groupId, addedBy, l))));
  },

  async listListings(groupId) {
    const rows = check(await db().from("listings").select().eq("group_id", groupId).order("created_at"));
    return (rows as Row[]).map(toListing);
  },

  async deleteListing(groupId, listingId) {
    check(await db().from("listings").delete().eq("group_id", groupId).eq("id", listingId));
  },

  async listFlags(groupId) {
    const rows = check(await db().from("listing_flags").select().eq("group_id", groupId));
    return (rows as Row[]).map<ListingFlag>((r) => ({
      groupId: r.group_id as string,
      listingId: r.listing_id as string,
      memberId: r.member_id as string,
      kind: r.kind as ListingFlag["kind"],
    }));
  },

  async setFlag(flag, on) {
    const row = { group_id: flag.groupId, listing_id: flag.listingId, member_id: flag.memberId, kind: flag.kind };
    if (on) check(await db().from("listing_flags").upsert(row));
    else check(await db().from("listing_flags").delete().match(row));
  },

  async listNotes(groupId) {
    const rows = check(await db().from("listing_notes").select().eq("group_id", groupId).order("created_at"));
    return (rows as Row[]).map<ListingNote>((r) => ({
      id: r.id as string,
      groupId: r.group_id as string,
      listingId: r.listing_id as string,
      memberId: r.member_id as string,
      authorName: r.author_name as string,
      body: r.body as string,
      createdAt: r.created_at as string,
    }));
  },

  async addNote(note) {
    check(
      await db().from("listing_notes").insert({
        group_id: note.groupId,
        listing_id: note.listingId,
        member_id: note.memberId,
        author_name: note.authorName,
        body: note.body,
      }),
    );
  },

  async saveMatchResults(groupId, rows) {
    if (rows.length === 0) return;
    check(
      await db()
        .from("match_results")
        .upsert(
          rows.map((r) => ({
            group_id: groupId,
            listing_id: r.listingId,
            viable: r.viable,
            group_score: r.groupScore,
            evaluation: r.evaluation,
            computed_at: new Date().toISOString(),
          })),
        ),
    );
  },
};
