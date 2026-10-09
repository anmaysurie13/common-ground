import type {
  FlagKind,
  Group,
  GroupStatus,
  Listing,
  ListingFlag,
  ListingInput,
  ListingNote,
  MemberRecord,
  Preferences,
} from "../types";

export interface MatchResultRow {
  listingId: string;
  viable: boolean;
  groupScore: number;
  evaluation: unknown;
}

/** Storage contract. Implemented by Supabase (production) and a local JSON file (zero-config dev). */
export interface Repo {
  readonly kind: "supabase" | "local";

  createGroup(input: { code: string; name: string; size: number; isDemo: boolean }): Promise<Group>;
  getGroupByCode(code: string): Promise<Group | null>;
  setGroupStatus(groupId: string, status: GroupStatus): Promise<void>;

  createMembers(groupId: string, members: { slot: number; name: string | null; secretHash: string }[]): Promise<MemberRecord[]>;
  listMembers(groupId: string): Promise<MemberRecord[]>;
  claimMember(memberId: string, name: string, secretHash: string): Promise<void>;
  savePreferences(memberId: string, groupId: string, preferences: Preferences, submit: boolean): Promise<void>;

  createListing(groupId: string, addedBy: string, input: ListingInput): Promise<Listing>;
  /** Bulk insert in one round trip (used to seed the demo). */
  createListings(groupId: string, addedBy: string, inputs: ListingInput[]): Promise<void>;
  listListings(groupId: string): Promise<Listing[]>;
  deleteListing(groupId: string, listingId: string): Promise<void>;

  listFlags(groupId: string): Promise<ListingFlag[]>;
  setFlag(flag: ListingFlag, on: boolean): Promise<void>;
  listNotes(groupId: string): Promise<ListingNote[]>;
  addNote(note: Omit<ListingNote, "id" | "createdAt">): Promise<void>;

  saveMatchResults(groupId: string, rows: MatchResultRow[]): Promise<void>;
}

export type { FlagKind };
