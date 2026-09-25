import Link from "next/link";
import { repo } from "@/lib/db";
import { inr } from "@/lib/format";
import { displayName, loadGroup, runMatching } from "@/lib/group";
import { MATCH_CONFIG } from "@/lib/matching/config";
import { MatchingGate } from "@/components/gate";
import { Legend } from "@/components/match-ui";
import { ResultCard } from "@/components/result-card";
import { Card, Container, LinkButton, PageTitle } from "@/components/ui";

export default async function ResultsPage({ params }: PageProps<"/g/[code]/results">) {
  const { code } = await params;
  const { group, members, me, allSubmitted } = await loadGroup(code);
  if (group.status !== "locked" || !allSubmitted) return <MatchingGate code={code} group={group} members={members} />;

  const [listings, flags] = await Promise.all([repo.listListings(group.id), repo.listFlags(group.id)]);
  const outcome = runMatching(members, listings);
  const byId = new Map(listings.map((l) => [l.id, l]));
  const nameOf = new Map(members.map((m) => [m.id, displayName(m)]));
  const discussBy = (listingId: string) =>
    flags.filter((f) => f.listingId === listingId && f.kind === "discuss").map((f) => nameOf.get(f.memberId) ?? "");

  const n = outcome.shortlist.length;
  const title =
    listings.length === 0
      ? "Add some listings to get started"
      : n === 0
        ? "No listing works for everyone yet"
        : n === 1
          ? "One flat works for everyone"
          : `${n} flats work for everyone`;

  return (
    <Container className="py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle eyebrow={`${listings.length} listings checked`} title={title}>
          We don&apos;t choose your flat. We make the trade-offs clear so you can choose together.
        </PageTitle>
        {n >= 2 && (
          <LinkButton href={`/g/${code}/compare`} variant="secondary" className="mb-8 self-start sm:self-auto">
            Compare side by side
          </LinkButton>
        )}
      </div>

      {listings.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted">No listings yet.</p>
          {me.length > 0 && <LinkButton href={`/g/${code}/listings/new`} className="mt-4">Add a listing</LinkButton>}
        </Card>
      )}

      {n > 0 && (
        <>
          <div className="mb-5">
            <Legend />
          </div>
          <div className="space-y-5">
            {outcome.shortlist.map((e, i) => (
              <ResultCard key={e.listingId} code={code} listing={byId.get(e.listingId)!} evaluation={e} index={i} discussBy={discussBy(e.listingId)} />
            ))}
          </div>
        </>
      )}

      {n === 0 && listings.length > 0 && (
        <Card className="p-6 text-muted">
          Every listing breaks at least one person&apos;s dealbreaker or must-have. Look at what&apos;s blocking each one
          below — it may be worth a conversation about whether a must-have is really a must.
        </Card>
      )}

      {outcome.moreViable.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Also viable</h2>
          <p className="mt-1 text-sm text-muted">These work for everyone too, with more compromises.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {outcome.moreViable.map((e) => {
              const l = byId.get(e.listingId)!;
              return (
                <Link key={e.listingId} href={`/g/${code}/listings/${l.id}`}>
                  <Card className="flex items-center justify-between gap-4 p-4 transition hover:shadow-lift">
                    <div>
                      <p className="font-medium">{l.title}</p>
                      <p className="text-sm text-muted">{l.area} · {inr(l.rent)}/mo</p>
                    </div>
                    <span className="font-semibold tabular-nums">{e.groupScore}</span>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {outcome.excluded.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Didn&apos;t make the shortlist</h2>
          <p className="mt-1 text-sm text-muted">
            Caught before anyone got attached. Each breaks at least one dealbreaker or must-have.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {outcome.excluded.map((e) => {
              const l = byId.get(e.listingId)!;
              return (
                <Link key={e.listingId} href={`/g/${code}/listings/${l.id}`}>
                  <Card className="h-full p-5 transition hover:shadow-lift">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium">{l.title}</p>
                      <p className="shrink-0 text-sm text-muted">{l.area} · {inr(l.rent)}</p>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {e.blockers.map((b) => (
                        <li key={b} className="flex gap-2">
                          <span className="text-bad" aria-hidden>✕</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <details className="group mt-12 rounded-3xl border border-line bg-surface/60 p-6">
        <summary className="cursor-pointer list-none font-medium">
          How matching works <span className="text-muted group-open:hidden">+</span>
        </summary>
        <div className="mt-4 grid gap-6 text-sm text-muted md:grid-cols-2">
          <ol className="list-decimal space-y-2 pl-5">
            <li><span className="text-ink">Dealbreakers</span> — any violation means the flat does not work for that person. Always excluded.</li>
            <li><span className="text-ink">Must-haves</span> — each checked individually. Missing one also excludes the flat.</li>
            <li><span className="text-ink">Preferences</span> — weighted and negotiable. They shape the score and appear as compromises.</li>
            <li><span className="text-ink">Group match</span> — the average of everyone&apos;s individual scores. Ties go to the flat whose lowest individual score is higher.</li>
          </ol>
          <div className="space-y-2">
            <p>
              Individual score = must-haves ({MATCH_CONFIG.split.mustHaves} pts) + preferences ({MATCH_CONFIG.split.preferences} pts)
              − {MATCH_CONFIG.compromisePenalty} pts per compromise.
            </p>
            <p>
              Preference weights: rent {MATCH_CONFIG.preferenceWeights.rent}, area {MATCH_CONFIG.preferenceWeights.area}, commute{" "}
              {MATCH_CONFIG.preferenceWeights.commute}, bathrooms {MATCH_CONFIG.preferenceWeights.bathrooms}, lift / parking / pets /
              furnishing {MATCH_CONFIG.preferenceWeights.lift}, each amenity {MATCH_CONFIG.preferenceWeights.amenity}.
            </p>
            <p>All checks run on the server with fixed rules. AI summaries can&apos;t change eligibility or scores.</p>
          </div>
        </div>
      </details>
    </Container>
  );
}
