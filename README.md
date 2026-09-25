# Common Ground

**Find a flat everyone can actually agree on.**
Three people. Three sets of preferences. One transparent shortlist.

Common Ground is for friends who want to rent together but want different things. Everyone submits their
constraints privately, the group locks them, and every listing is checked against all three people the same
way. The app returns the 2–3 viable options and spells out what each person gets and gives up.

> We don't choose your flat. We make the trade-offs clear so you can choose together.

## The problem it solves

- **Before:** someone sees a flat, gets excited, posts it to the group chat, and then someone else spots the dealbreaker. Argument.
- **After:** everyone states their constraints first, listings are checked objectively, and the group sees the trade-offs before anyone gets attached.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 and click **Try the demo**. It runs with **no API keys**: without Supabase configured,
data is stored in `.data/db.json`, and without a Gemini key the AI helpers are hidden and summaries come from rules.

The demo group (Riya, Meera and Kavita looking in Pune) has all three preferences submitted and 7 listings added.
Lock the preferences and you'll see:

| Listing | Result |
| --- | --- |
| Baner, Bavdhan, Aundh | **Viable.** Each has a different set of compromises |
| Kothrud (no lift) | Does not work for Meera (lift is a dealbreaker) or Kavita (55 min commute) |
| Hinjewadi | Ruled out by Meera (excluded area). Riya's commute must-have isn't met |
| Wakad | Riya's 30-minute commute must-have isn't met |
| Balewadi premium | Over everyone's maximum budget |

```bash
npm test        # matching-engine tests (vitest)
npm run build   # production build
```

## How matching works

The matching engine (`src/lib/matching/engine.ts`) is **deterministic and runs only on the server**: no randomness,
no AI. Scores the client sends are never trusted.

1. **Dealbreakers (no-go):** a single violation means the flat "does not work for X", and it's excluded. Over-max rent and excluded areas are always dealbreakers.
2. **Must-haves (need):** each one is checked on its own. If one is missing, the flat is excluded too.
3. **Preferences (would like):** weighted and negotiable. They produce the score and the list of compromises.
4. **Group match:** the average of the individual scores. Ties go to the flat whose lowest individual score is higher.

```
individual = must-have points (50) + preference points (50) − 2 per compromise
```

All weights are in `src/lib/matching/config.ts`, and the UI reads them from there to explain the scores. If a
listing is missing data (say, a commute time), that requirement is marked **unknown** and flagged to check. The
engine never guesses.

## AI (Gemini): optional

Gemini is used only where it helps, and only on the server:

- **Draft preferences from free text.** The person reviews every field before submitting.
- **Plain-language summary** of a flat's fit, written only from the engine's checks.

Gemini can't change eligibility or scores, and it isn't given a way to. If it's unavailable, the app falls back to
rule-based summaries.

## Configuration

Copy `.env.example` to `.env.local`:

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Database access from server actions |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Not used yet. Reserved for adding Supabase Auth |
| `GEMINI_API_KEY` | **server only** | Optional AI helpers |
| `GEMINI_MODEL` | server | Optional, defaults to `gemini-2.5-flash` |

### Supabase setup

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` in the SQL editor.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then restart.

## Security model

- The browser never talks to Supabase directly. All reads and writes go through server actions using the service-role key, which is never exposed to the client.
- **RLS is enabled on every table with no anon/authenticated policies**, so a leaked anon key can't read anything.
- There are no accounts. Groups are reached through an unguessable invite code, and each member proves who they are with a random secret in an httpOnly cookie. Only a SHA-256 hash of that secret is stored.
- Every input is validated with zod on the server. People can only edit their own preferences, and nobody can edit after the group locks.

## Project structure

```
src/
  app/
    actions.ts                 server actions (all writes + validation + auth checks)
    page.tsx                   landing
    new/                       create group
    g/[code]/                  group status, join, preferences, listings, results, compare
  components/                  UI building blocks
  lib/
    matching/engine.ts         deterministic matching engine (+ tests)
    matching/config.ts         all weights
    db/                        Repo interface, Supabase + local JSON implementations
    gemini.ts                  optional AI helpers
    demo.ts                    Riya / Meera / Kavita scenario
supabase/schema.sql            tables, constraints, RLS
```

## Not included yet

- **Live listing import.** Listings are entered by hand (or come from the demo). No real-estate API is integrated or assumed. Before connecting any source (NoBroker, 99acres, Housing.com, MagicBricks, Google Maps for commute times), check what official API or terms that source actually offers.
- Editing listings after they're added (for now, remove and re-add).
- Accounts. If someone clears their cookies, they can't edit their spot any more.
