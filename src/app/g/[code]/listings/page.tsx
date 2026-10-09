import Link from "next/link";
import { repo } from "@/lib/db";
import { inr } from "@/lib/format";
import { loadGroupForRender, runMatching } from "@/lib/group";
import { ListingThumb } from "@/components/match-ui";
import { Badge, Card, Container, LinkButton, PageTitle } from "@/components/ui";

export default async function ListingsPage({ params }: PageProps<"/g/[code]/listings">) {
  const { code } = await params;
  const { group, members, me } = await loadGroupForRender(code);
  const listings = await repo.listListings(group.id);
  const locked = group.status === "locked";
  const outcome = locked ? runMatching(members, listings) : null;

  return (
    <Container className="py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle title="Listings">
          {locked
            ? "Every listing is checked against all locked preferences. Viable ones make the shortlist."
            : "Add flats as you find them. They'll be checked once everyone's preferences are locked — no early excitement."}
        </PageTitle>
        {me.length > 0 && (
          <LinkButton href={`/g/${code}/listings/new`} className="mb-8 self-start sm:self-auto">
            Add a listing
          </LinkButton>
        )}
      </div>

      {listings.length === 0 ? (
        <Card className="p-10 text-center text-muted">No listings yet.</Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => {
            const e = outcome?.byId[l.id];
            const out = e?.people.filter((p) => p.status !== "works").map((p) => p.name) ?? [];
            return (
              <Link key={l.id} href={`/g/${code}/listings/${l.id}`} className="group">
                <Card className="overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
                  <ListingThumb listing={l} className="h-32 w-full" />
                  <div className="p-5">
                    <p className="font-semibold leading-snug">{l.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {l.area} · {inr(l.rent)}/mo · {l.bedrooms}BHK
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {e ? (
                        e.viable ? (
                          <Badge tone="good">Viable · {e.groupScore} match</Badge>
                        ) : (
                          <Badge tone="bad">Does not work for {out.join(", ")}</Badge>
                        )
                      ) : (
                        <Badge>Not evaluated yet</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
