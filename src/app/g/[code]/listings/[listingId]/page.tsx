import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/db";
import { floorLabel, furnishingLabel, inr } from "@/lib/format";
import { aiEnabled } from "@/lib/gemini";
import { displayName, loadGroupForRender, runMatching } from "@/lib/group";
import { DiscussionPanel } from "@/components/discussion-panel";
import { ExplainButton } from "@/components/explain-button";
import { ListingGallery } from "@/components/listing-gallery";
import { PlaceholderThumb, ScoreRing } from "@/components/match-ui";
import { PersonBreakdown } from "@/components/person-breakdown";
import { Badge, Card, Container } from "@/components/ui";
import { DeleteListing } from "./delete-listing";

export default async function ListingDetailPage({ params }: PageProps<"/g/[code]/listings/[listingId]">) {
  const { code, listingId } = await params;
  const { group, members, me, allSubmitted } = await loadGroupForRender(code);
  const [listings, flags, notes] = await Promise.all([
    repo.listListings(group.id),
    repo.listFlags(group.id),
    repo.listNotes(group.id),
  ]);
  const listing = listings.find((l) => l.id === listingId);
  if (!listing) notFound();

  const locked = group.status === "locked" && allSubmitted;
  const outcome = locked ? runMatching(members, listings) : null;
  const e = outcome?.byId[listing.id];
  const onShortlist = outcome?.shortlist.some((s) => s.listingId === listing.id);
  const share = listing.rent / Math.max(members.length, 1);

  const facts: [string, string][] = [
    ["Rent", `${inr(listing.rent)}/mo`],
    ["Per person", inr(share)],
    ["Bedrooms", String(listing.bedrooms)],
    ["Bathrooms", String(listing.bathrooms)],
    ["Floor", floorLabel(listing.floor)],
    ["Lift", listing.lift ? "Yes" : "No"],
    ["Parking", listing.parking ? "Yes" : "No"],
    ["Pets", listing.petFriendly ? "Allowed" : "Not allowed"],
    ["Furnishing", furnishingLabel(listing.furnishing)],
  ];

  return (
    <Container className="py-8">
      <Link href={`/g/${code}/${locked ? "results" : "listings"}`} className="text-sm text-muted hover:text-ink">
        ← Back to {locked ? "shortlist" : "listings"}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <ListingGallery
              images={listing.images}
              title={listing.title}
              credit={group.isDemo ? "Illustrative photos · Unsplash" : undefined}
              placeholder={<PlaceholderThumb listing={listing} className="h-56 w-full sm:h-80" />}
            />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{listing.title}</h1>
                  <p className="mt-1 text-muted">
                    {listing.area} · added by {listing.addedBy || "a group member"}
                  </p>
                </div>
                {e && <ScoreRing value={e.groupScore} size={72} label="group" />}
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-faint">{k}</dt>
                    <dd className="mt-0.5 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              {listing.amenities.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {listing.amenities.map((a) => (
                    <Badge key={a}>{a}</Badge>
                  ))}
                </div>
              )}
              {(listing.description || listing.locationNotes) && (
                <div className="mt-6 space-y-2 text-sm text-muted">
                  {listing.description && <p>{listing.description}</p>}
                  {listing.locationNotes && <p>📍 {listing.locationNotes}</p>}
                </div>
              )}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-5 text-sm">
                {listing.url ? (
                  <a href={listing.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-accent hover:underline">
                    View original listing ↗
                  </a>
                ) : (
                  <span className="text-faint">Source: added manually</span>
                )}
                {me.length > 0 && <DeleteListing code={code} listingId={listing.id} />}
              </div>
            </div>
          </Card>

          {!e ? (
            <Card className="p-6 text-muted">
              This listing will be checked against everyone&apos;s preferences once they&apos;re all submitted and locked.
            </Card>
          ) : (
            <>
              <Card className={e.viable ? "border-good/30 p-6" : "border-bad/30 p-6"}>
                <div className="flex flex-wrap items-center gap-2">
                  {e.viable ? <Badge tone="good">Qualifies</Badge> : <Badge tone="bad">Not viable</Badge>}
                  {onShortlist && <Badge tone="accent">On the shortlist</Badge>}
                </div>
                <h2 className="mt-3 text-lg font-semibold">
                  {e.viable ? "Why it qualified" : "Why it didn't make the shortlist"}
                </h2>
                {e.viable ? (
                  <p className="mt-1 text-sm text-muted">
                    It clears every dealbreaker and must-have for {members.map(displayName).join(", ")}. The score reflects how
                    many negotiable preferences it also meets.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {e.blockers.map((b) => (
                      <li key={b} className="flex gap-2">
                        <span className="text-bad">✕</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                {e.tradeoffs.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm text-warn">
                    {e.tradeoffs.map((t) => (
                      <li key={t}>△ {t}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-5">
                  <ExplainButton code={code} listingId={listing.id} aiEnabled={aiEnabled} />
                </div>
              </Card>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {e.people.map((p) => (
                  <PersonBreakdown key={p.memberId} person={p} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <DiscussionPanel
            code={code}
            listingId={listing.id}
            members={members.map((m) => ({ id: m.id, name: displayName(m) }))}
            me={me.map((m) => ({ id: m.id, name: displayName(m) }))}
            flags={flags.filter((f) => f.listingId === listing.id)}
            notes={notes.filter((n) => n.listingId === listing.id)}
          />
        </div>
      </div>
    </Container>
  );
}
