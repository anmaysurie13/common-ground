import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { MemberRecord } from "./types";

// Lightweight identity without accounts: each member gets a random secret stored in an
// httpOnly cookie scoped to their group. The database only ever sees its SHA-256 hash.

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(length = 10): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function newSecret(): { secret: string; hash: string } {
  const secret = randomBytes(32).toString("base64url");
  return { secret, hash: hashSecret(secret) };
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

const cookieName = (code: string) => `cg_${code}`;

function parse(value: string | undefined): { memberId: string; secret: string }[] {
  if (!value) return [];
  return value
    .split("|")
    .map((pair) => pair.split(":"))
    .filter((p) => p.length === 2 && p[0] && p[1])
    .map(([memberId, secret]) => ({ memberId, secret }));
}

export async function rememberMembers(code: string, entries: { memberId: string; secret: string }[]) {
  const store = await cookies();
  const existing = parse(store.get(cookieName(code))?.value).filter(
    (e) => !entries.some((n) => n.memberId === e.memberId),
  );
  const value = [...existing, ...entries].map((e) => `${e.memberId}:${e.secret}`).join("|");
  store.set(cookieName(code), value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

/** Members of this group that the current browser has proven it controls. */
export async function controlledMemberIds(code: string, members: MemberRecord[]): Promise<Set<string>> {
  const store = await cookies();
  const ids = new Set<string>();
  for (const { memberId, secret } of parse(store.get(cookieName(code))?.value)) {
    const member = members.find((m) => m.id === memberId);
    if (!member) continue;
    const a = Buffer.from(hashSecret(secret), "hex");
    const b = Buffer.from(member.secretHash, "hex");
    if (a.length === b.length && timingSafeEqual(a, b)) ids.add(memberId);
  }
  return ids;
}
