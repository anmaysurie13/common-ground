import "server-only";
import { localRepo } from "./local";
import type { Repo } from "./repo";
import { supabaseRepo } from "./supabase";

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/** Supabase when configured, otherwise a local JSON file so the app works straight after install. */
export const repo: Repo = supabaseConfigured ? supabaseRepo : localRepo;
