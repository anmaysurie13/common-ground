-- Common Ground schema. Run in the Supabase SQL editor (or `supabase db push`).
--
-- Access model: the Next.js server talks to Supabase with the service-role key; the browser
-- never talks to Supabase directly. RLS is enabled on every table with NO policies for the
-- anon/authenticated roles, which means the public anon key can read/write nothing.
-- Group access is controlled in the app by an unguessable invite code plus a per-member secret
-- (stored here only as a SHA-256 hash). If you add Supabase Auth later, add policies here.

create extension if not exists pgcrypto;

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (char_length(code) between 8 and 32),
  name        text not null check (char_length(name) between 1 and 60),
  size        int  not null default 3 check (size between 2 and 4),
  status      text not null default 'collecting' check (status in ('collecting', 'locked')),
  is_demo     boolean not null default false,
  locked_at   timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups(id) on delete cascade,
  slot          int  not null check (slot between 1 and 4),
  name          text check (char_length(name) between 1 and 40),
  secret_hash   text not null,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (group_id, slot)
);

create table if not exists public.preferences (
  member_id   uuid primary key references public.group_members(id) on delete cascade,
  group_id    uuid not null references public.groups(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.listings (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups(id) on delete cascade,
  title           text not null check (char_length(title) between 3 and 120),
  area            text not null,
  rent            int  not null check (rent > 0),
  bedrooms        int  not null check (bedrooms > 0),
  bathrooms       int  not null check (bathrooms > 0),
  floor           int  not null default 0 check (floor >= 0),
  has_lift        boolean not null default false,
  has_parking     boolean not null default false,
  pet_friendly    boolean not null default false,
  furnishing      text not null check (furnishing in ('furnished', 'semi-furnished', 'unfurnished')),
  commutes        jsonb not null default '{}'::jsonb,  -- { member_id: minutes }
  location_notes  text not null default '',
  url             text not null default '',
  description     text not null default '',
  images          text[] not null default '{}',
  amenities       text[] not null default '{}',
  added_by        text not null default '',
  created_at      timestamptz not null default now()
);

-- Snapshot of the deterministic engine's output, computed server-side.
create table if not exists public.match_results (
  group_id     uuid not null references public.groups(id) on delete cascade,
  listing_id   uuid not null references public.listings(id) on delete cascade,
  viable       boolean not null,
  group_score  int not null check (group_score between 0 and 100),
  evaluation   jsonb not null,
  computed_at  timestamptz not null default now(),
  primary key (group_id, listing_id)
);

-- "Saved" and "Worth discussing" markers, per member.
create table if not exists public.listing_flags (
  group_id    uuid not null references public.groups(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  member_id   uuid not null references public.group_members(id) on delete cascade,
  kind        text not null check (kind in ('saved', 'discuss')),
  created_at  timestamptz not null default now(),
  primary key (listing_id, member_id, kind)
);

create table if not exists public.listing_notes (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups(id) on delete cascade,
  listing_id   uuid not null references public.listings(id) on delete cascade,
  member_id    uuid not null references public.group_members(id) on delete cascade,
  author_name  text not null,
  body         text not null check (char_length(body) between 1 and 1000),
  created_at   timestamptz not null default now()
);

create index if not exists group_members_group_idx on public.group_members(group_id);
create index if not exists listings_group_idx on public.listings(group_id);
create index if not exists listing_flags_group_idx on public.listing_flags(group_id);
create index if not exists listing_notes_group_idx on public.listing_notes(group_id);

alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.preferences    enable row level security;
alter table public.listings       enable row level security;
alter table public.match_results  enable row level security;
alter table public.listing_flags  enable row level security;
alter table public.listing_notes  enable row level security;

-- Belt and braces: the public roles hold no privileges on these tables either.
-- (Scoped to this app's tables so other tables in a shared project are untouched.)
revoke all on public.groups, public.group_members, public.preferences, public.listings,
  public.match_results, public.listing_flags, public.listing_notes from anon, authenticated;
