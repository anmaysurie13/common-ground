// Core domain types shared by the matching engine, data layer and UI.

/** How much a person cares about a feature. Dealbreakers are modelled separately. */
export type Importance = "must" | "nice" | "none";

export type Furnishing = "furnished" | "semi-furnished" | "unfurnished";

export interface Preferences {
  /** Monthly rent contribution (this person's share), in INR. */
  budget: { max: number; ideal: number };
  areas: { preferred: string[]; excluded: string[] };
  /** importance "none" means no commute constraint at all. */
  commute: { destination: string; maxMinutes: number; importance: Importance };
  lift: Importance;
  parking: Importance;
  petFriendly: Importance;
  bathrooms: { min: number; importance: Importance };
  furnishing: { type: Furnishing; importance: Importance };
  amenities: { must: string[]; nice: string[] };
  /**
   * Explicit no-gos. Any violation disqualifies a listing for this person.
   * Rent share above budget.max and listings in an excluded area are always dealbreakers.
   */
  dealbreakers: {
    noLift: boolean;
    noParking: boolean;
    notPetFriendly: boolean;
    groundFloor: boolean;
    commuteOverLimit: boolean;
  };
  /** Free text. Shown to the group but never auto-evaluated. */
  otherConstraints: string;
}

export type GroupStatus = "collecting" | "locked";

export interface Group {
  id: string;
  code: string;
  name: string;
  size: number;
  status: GroupStatus;
  isDemo: boolean;
  lockedAt: string | null;
  createdAt: string;
}

export interface Member {
  id: string;
  groupId: string;
  slot: number;
  name: string | null;
  submittedAt: string | null;
  preferences: Preferences | null;
}

/** Server-only shape: includes the hashed secret used to prove membership. */
export interface MemberRecord extends Member {
  secretHash: string;
}

export interface ListingInput {
  title: string;
  area: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  floor: number;
  lift: boolean;
  parking: boolean;
  petFriendly: boolean;
  furnishing: Furnishing;
  /** Approximate commute minutes keyed by member id. Missing = unknown. */
  commutes: Record<string, number>;
  locationNotes: string;
  url: string;
  description: string;
  images: string[];
  amenities: string[];
}

export interface Listing extends ListingInput {
  id: string;
  groupId: string;
  addedBy: string;
  createdAt: string;
}

export type FlagKind = "saved" | "discuss";

export interface ListingFlag {
  groupId: string;
  listingId: string;
  memberId: string;
  kind: FlagKind;
}

export interface ListingNote {
  id: string;
  groupId: string;
  listingId: string;
  memberId: string;
  authorName: string;
  body: string;
  createdAt: string;
}
