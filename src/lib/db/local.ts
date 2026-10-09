import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Group, Listing, ListingFlag, ListingNote, MemberRecord } from "../types";
import type { MatchResultRow, Repo } from "./repo";

// Zero-config store for local development and demos: a single JSON file in .data/.
// If the filesystem is read-only (e.g. serverless), it silently stays in memory.

interface Db {
  groups: Group[];
  members: MemberRecord[];
  listings: Listing[];
  flags: ListingFlag[];
  notes: ListingNote[];
  matchResults: (MatchResultRow & { groupId: string; computedAt: string })[];
}

const FILE = path.join(process.cwd(), ".data", "db.json");
const globalStore = globalThis as unknown as { __commonGroundDb?: Db; __commonGroundLock?: Promise<unknown> };

async function load(): Promise<Db> {
  if (globalStore.__commonGroundDb) return globalStore.__commonGroundDb;
  try {
    globalStore.__commonGroundDb = JSON.parse(await fs.readFile(FILE, "utf8")) as Db;
  } catch {
    globalStore.__commonGroundDb = { groups: [], members: [], listings: [], flags: [], notes: [], matchResults: [] };
  }
  return globalStore.__commonGroundDb;
}

async function persist(db: Db) {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(db, null, 2));
  } catch {
    // Read-only filesystem: keep the in-memory copy.
  }
}

/** Serialises writes so concurrent requests can't clobber each other. */
async function write<T>(fn: (db: Db) => T): Promise<T> {
  const run = (globalStore.__commonGroundLock ?? Promise.resolve()).then(async () => {
    const db = await load();
    const result = fn(db);
    await persist(db);
    return result;
  });
  globalStore.__commonGroundLock = run.catch(() => undefined);
  return run;
}

const clone = <T>(v: T): T => structuredClone(v);

export const localRepo: Repo = {
  kind: "local",

  async createGroup(input) {
    return write((db) => {
      const group: Group = {
        id: randomUUID(),
        code: input.code,
        name: input.name,
        size: input.size,
        status: "collecting",
        isDemo: input.isDemo,
        lockedAt: null,
        createdAt: new Date().toISOString(),
      };
      db.groups.push(group);
      return clone(group);
    });
  },

  async getGroupByCode(code) {
    const db = await load();
    const g = db.groups.find((x) => x.code === code);
    return g ? clone(g) : null;
  },

  async setGroupStatus(groupId, status) {
    await write((db) => {
      const g = db.groups.find((x) => x.id === groupId);
      if (g) {
        g.status = status;
        g.lockedAt = status === "locked" ? new Date().toISOString() : null;
      }
    });
  },

  async createMembers(groupId, members) {
    return write((db) => {
      const created = members.map<MemberRecord>((m) => ({
        id: randomUUID(),
        groupId,
        slot: m.slot,
        name: m.name,
        secretHash: m.secretHash,
        submittedAt: null,
        preferences: null,
      }));
      db.members.push(...created);
      return clone(created);
    });
  },

  async listMembers(groupId) {
    const db = await load();
    return clone(db.members.filter((m) => m.groupId === groupId).sort((a, b) => a.slot - b.slot));
  },

  async claimMember(memberId, name, secretHash) {
    await write((db) => {
      const m = db.members.find((x) => x.id === memberId);
      if (!m) throw new Error("Member not found");
      if (m.name) throw new Error("That spot has already been claimed.");
      m.name = name;
      m.secretHash = secretHash;
    });
  },

  async savePreferences(memberId, _groupId, preferences, submit) {
    await write((db) => {
      const m = db.members.find((x) => x.id === memberId);
      if (!m) throw new Error("Member not found");
      m.preferences = preferences;
      if (submit) m.submittedAt = new Date().toISOString();
    });
  },

  async createListing(groupId, addedBy, input) {
    return write((db) => {
      const listing: Listing = { ...input, id: randomUUID(), groupId, addedBy, createdAt: new Date().toISOString() };
      db.listings.push(listing);
      return clone(listing);
    });
  },

  async createListings(groupId, addedBy, inputs) {
    await write((db) => {
      const createdAt = new Date().toISOString();
      db.listings.push(...inputs.map((input) => ({ ...input, id: randomUUID(), groupId, addedBy, createdAt })));
    });
  },

  async listListings(groupId) {
    const db = await load();
    return clone(db.listings.filter((l) => l.groupId === groupId));
  },

  async deleteListing(groupId, listingId) {
    await write((db) => {
      db.listings = db.listings.filter((l) => !(l.groupId === groupId && l.id === listingId));
      db.flags = db.flags.filter((f) => f.listingId !== listingId);
      db.notes = db.notes.filter((n) => n.listingId !== listingId);
      db.matchResults = db.matchResults.filter((r) => r.listingId !== listingId);
    });
  },

  async listFlags(groupId) {
    const db = await load();
    return clone(db.flags.filter((f) => f.groupId === groupId));
  },

  async setFlag(flag, on) {
    await write((db) => {
      db.flags = db.flags.filter(
        (f) => !(f.listingId === flag.listingId && f.memberId === flag.memberId && f.kind === flag.kind),
      );
      if (on) db.flags.push(flag);
    });
  },

  async listNotes(groupId) {
    const db = await load();
    return clone(db.notes.filter((n) => n.groupId === groupId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async addNote(note) {
    await write((db) => {
      db.notes.push({ ...note, id: randomUUID(), createdAt: new Date().toISOString() });
    });
  },

  async saveMatchResults(groupId, rows) {
    await write((db) => {
      const computedAt = new Date().toISOString();
      db.matchResults = db.matchResults.filter((r) => r.groupId !== groupId);
      db.matchResults.push(...rows.map((r) => ({ ...r, groupId, computedAt })));
    });
  },
};
