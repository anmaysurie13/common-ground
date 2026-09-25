import { displayName, loadGroup } from "@/lib/group";
import { Container, LinkButton, PageTitle } from "@/components/ui";
import { ListingForm } from "../listing-form";

export default async function NewListingPage({ params }: PageProps<"/g/[code]/listings/new">) {
  const { code } = await params;
  const { members, me } = await loadGroup(code);

  if (me.length === 0) {
    return (
      <Container className="max-w-xl py-12">
        <PageTitle title="Only group members can add listings" />
        <LinkButton href={`/g/${code}`} variant="secondary">Back to group</LinkButton>
      </Container>
    );
  }

  const commuteTargets = members
    .filter((m) => m.preferences && m.preferences.commute.destination && (m.preferences.commute.importance !== "none" || m.preferences.dealbreakers.commuteOverLimit))
    .map((m) => ({ memberId: m.id, name: displayName(m), destination: m.preferences!.commute.destination }));

  return (
    <Container className="max-w-3xl py-10">
      <PageTitle title="Add a listing">
        Enter only what the listing actually says. Anything you leave out is marked as unknown rather than assumed.
      </PageTitle>
      <ListingForm code={code} commuteTargets={commuteTargets} />
    </Container>
  );
}
