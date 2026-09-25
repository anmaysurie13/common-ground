import { headers } from "next/headers";
import Link from "next/link";
import { repo } from "@/lib/db";
import { displayName, loadGroup } from "@/lib/group";
import { Avatar } from "@/components/match-ui";
import { Badge, Card, Container, LinkButton, PageTitle } from "@/components/ui";
import { CopyLink } from "./copy-link";
import { LockControls } from "./lock-controls";

export default async function GroupPage({ params, searchParams }: PageProps<"/g/[code]">) {
  const { code } = await params;
  const { created } = await searchParams;
  const { group, members, me, allSubmitted } = await loadGroup(code);
  const listings = await repo.listListings(group.id);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const inviteUrl = `${proto}://${host}/g/${code}/join`;
  const submitted = members.filter((m) => m.submittedAt).length;
  const myIds = new Set(me.map((m) => m.id));

  return (
    <Container className="py-10">
      <PageTitle
        eyebrow={created ? "Group created" : undefined}
        title={
          group.status === "locked"
            ? "Preferences are locked in."
            : allSubmitted
              ? "Everyone's in. Ready to lock?"
              : `${submitted} of ${group.size} have submitted`
        }
      >
        {group.status === "locked"
          ? "Listings are now checked against everyone's constraints. Head to the shortlist to see viable options."
          : "Everyone submits their constraints first. Matching only starts once all preferences are locked — so nobody falls for a flat that doesn't work for someone else."}
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6 sm:p-8">
          <h3 className="font-semibold">Who&apos;s in</h3>
          <ul className="mt-5 divide-y divide-line/70">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  {m.name ? <Avatar name={m.name} size="md" /> : <span className="size-10 rounded-full border border-dashed border-line" />}
                  <div>
                    <p className="font-medium">
                      {displayName(m)}
                      {myIds.has(m.id) && !group.isDemo && <span className="ml-2 text-xs text-muted">(you)</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {!m.name ? "Waiting for someone to join" : m.submittedAt ? "Preferences submitted" : "Filling in preferences"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {m.submittedAt ? (
                    <Badge tone="good">✓ Submitted</Badge>
                  ) : (
                    <Badge>{m.name ? "In progress" : "Open spot"}</Badge>
                  )}
                  {myIds.has(m.id) && group.status !== "locked" && (
                    <Link href={`/g/${code}/preferences?member=${m.id}`} className="text-sm font-medium text-accent hover:underline">
                      {m.submittedAt ? "Edit" : "Fill in"}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-line/70 pt-6">
            <LockControls code={code} status={group.status} allSubmitted={allSubmitted} isMember={me.length > 0} />
          </div>
        </Card>

        <div className="space-y-6">
          {group.status !== "locked" && members.some((m) => !m.name) && (
            <Card className="p-6">
              <h3 className="font-semibold">Invite your flatmates</h3>
              <p className="mt-1 text-sm text-muted">Share this link. Each person claims a spot and fills in their own preferences.</p>
              <CopyLink url={inviteUrl} />
            </Card>
          )}
          <Card className="p-6">
            <h3 className="font-semibold">Listings</h3>
            <p className="mt-1 text-sm text-muted">
              {listings.length === 0
                ? "No listings yet. Add flats you find — they'll be checked against everyone's preferences once locked."
                : `${listings.length} listing${listings.length === 1 ? "" : "s"} added.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {me.length > 0 && (
                <LinkButton href={`/g/${code}/listings/new`} variant="secondary">
                  Add a listing
                </LinkButton>
              )}
              {group.status === "locked" && (
                <LinkButton href={`/g/${code}/results`}>See the shortlist</LinkButton>
              )}
            </div>
          </Card>
          {me.length === 0 && group.status !== "locked" && members.some((m) => !m.name) && (
            <Card className="p-6">
              <h3 className="font-semibold">Part of this group?</h3>
              <LinkButton href={`/g/${code}/join`} className="mt-4">
                Join and add your preferences
              </LinkButton>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}
