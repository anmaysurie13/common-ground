import Link from "next/link";
import type { ReactNode } from "react";
import { repo } from "@/lib/db";
import { furnishingLabel, inr } from "@/lib/format";
import { displayName, loadGroup, runMatching } from "@/lib/group";
import { MatchingGate } from "@/components/gate";
import { StateIcon } from "@/components/match-ui";
import { Badge, Card, Container, PageTitle, cn } from "@/components/ui";

const MAX = 3;

export default async function ComparePage({ params, searchParams }: PageProps<"/g/[code]/compare">) {
  const { code } = await params;
  const { ids } = await searchParams;
  const { group, members, allSubmitted } = await loadGroup(code);
  if (group.status !== "locked" || !allSubmitted) return <MatchingGate code={code} group={group} members={members} />;

  const listings = await repo.listListings(group.id);
  const outcome = runMatching(members, listings);
  const requested = typeof ids === "string" ? ids.split(",").filter(Boolean) : [];
  const selectedIds = (requested.length ? requested : outcome.shortlist.map((e) => e.listingId))
    .filter((id) => outcome.byId[id])
    .slice(0, MAX);
  const selected = selectedIds.map((id) => ({ listing: listings.find((l) => l.id === id)!, e: outcome.byId[id] }));
  const ordered = [...outcome.shortlist, ...outcome.moreViable, ...outcome.excluded];

  const toggleHref = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id].slice(-MAX);
    return `/g/${code}/compare?ids=${next.join(",")}`;
  };

  const commuters = members.filter(
    (m) => m.preferences && (m.preferences.commute.importance !== "none" || m.preferences.dealbreakers.commuteOverLimit),
  );

  const rows: { label: string; cells: ReactNode[] }[] = [
    { label: "Group match", cells: selected.map(({ e }) => <span key={e.listingId} className="text-lg font-semibold tabular-nums">{e.groupScore}</span>) },
    { label: "Status", cells: selected.map(({ e }) => (e.viable ? <Badge key={e.listingId} tone="good">Works for everyone</Badge> : <Badge key={e.listingId} tone="bad">Not viable</Badge>)) },
    { label: "Rent", cells: selected.map(({ listing }) => `${inr(listing.rent)}/mo`) },
    { label: "Per person", cells: selected.map(({ e }) => inr(e.rentShare)) },
    { label: "Area", cells: selected.map(({ listing }) => listing.area) },
    { label: "Bedrooms", cells: selected.map(({ listing }) => listing.bedrooms) },
    { label: "Bathrooms", cells: selected.map(({ listing }) => listing.bathrooms) },
    { label: "Lift", cells: selected.map(({ listing }) => yesNo(listing.lift)) },
    { label: "Parking", cells: selected.map(({ listing }) => yesNo(listing.parking)) },
    { label: "Pets", cells: selected.map(({ listing }) => yesNo(listing.petFriendly)) },
    { label: "Furnishing", cells: selected.map(({ listing }) => furnishingLabel(listing.furnishing)) },
    ...commuters.map((m) => ({
      label: `Commute · ${displayName(m)}`,
      cells: selected.map(({ listing, e }) => {
        const c = e.people.find((p) => p.memberId === m.id)?.checks.find((x) => x.key === "commute");
        const min = listing.commutes[m.id];
        return (
          <span key={listing.id} className="flex items-center gap-2">
            {c && <StateIcon state={c.state} />}
            {min !== undefined ? `${min} min` : "Unknown"}
            <span className="text-xs text-faint">/ {m.preferences!.commute.maxMinutes}</span>
          </span>
        );
      }),
    })),
    ...members.map((m) => ({
      label: displayName(m),
      cells: selected.map(({ e }) => {
        const p = e.people.find((x) => x.memberId === m.id)!;
        const gives = p.checks.filter((c) => c.state === "compromise" || c.state === "unmet");
        return (
          <div key={e.listingId} className="space-y-1.5">
            <p className="flex items-center gap-2">
              <span className="font-semibold tabular-nums">{p.score}</span>
              {p.status !== "works" && <Badge tone="bad">{p.status === "dealbreaker" ? "Dealbreaker" : "Missing must-have"}</Badge>}
            </p>
            {gives.length > 0 ? (
              <ul className="space-y-1 text-xs text-muted">
                {gives.map((c) => (
                  <li key={c.key} className="flex items-start gap-1.5">
                    <StateIcon state={c.state} className="size-4" />
                    {c.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-good">No compromises</p>
            )}
          </div>
        );
      }),
    })),
    {
      label: "Compromises",
      cells: selected.map(({ e }) => {
        const count = e.people.reduce((s, p) => s + p.checks.filter((c) => c.state === "compromise").length, 0);
        return `${count} across the group`;
      }),
    },
  ];

  return (
    <Container className="py-10">
      <PageTitle title="Compare side by side">Pick up to three. Same rules, same rows — so the differences are the only thing that stands out.</PageTitle>

      <div className="mb-6 flex flex-wrap gap-2">
        {ordered.map((e) => {
          const l = listings.find((x) => x.id === e.listingId)!;
          const on = selectedIds.includes(e.listingId);
          return (
            <Link
              key={e.listingId}
              href={toggleHref(e.listingId)}
              scroll={false}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                on ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted hover:text-ink",
                !e.viable && !on && "opacity-60",
              )}
            >
              {on ? "✓ " : "+ "}
              {l.area} · {inr(l.rent)}
            </Link>
          );
        })}
      </div>

      {selected.length === 0 ? (
        <Card className="p-8 text-center text-muted">Pick listings above to compare.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-40 bg-surface p-4 text-left font-medium text-faint" scope="col">
                  <span className="sr-only">Attribute</span>
                </th>
                {selected.map(({ listing }) => (
                  <th key={listing.id} scope="col" className="p-4 text-left align-bottom">
                    <Link href={`/g/${code}/listings/${listing.id}`} className="font-semibold leading-snug hover:text-accent">
                      {listing.title}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-line/70">
                  <th scope="row" className="sticky left-0 z-10 bg-surface p-4 text-left align-top font-medium text-muted">
                    {r.label}
                  </th>
                  {r.cells.map((c, i) => (
                    <td key={i} className="p-4 align-top">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Container>
  );
}

function yesNo(v: boolean) {
  return v ? "Yes" : <span className="text-faint">No</span>;
}
