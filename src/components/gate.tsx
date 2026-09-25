import type { Group, Member } from "@/lib/types";
import { Card, Container, LinkButton, PageTitle } from "./ui";

/** Shown instead of results until every preference is in and locked. */
export function MatchingGate({ code, group, members }: { code: string; group: Group; members: Member[] }) {
  const submitted = members.filter((m) => m.submittedAt).length;
  return (
    <Container className="max-w-2xl py-12">
      <PageTitle title="Matching starts once preferences are locked">
        This is deliberate: nobody sees how a flat scores until everyone&apos;s constraints are in. It stops the
        &ldquo;I already love this one&rdquo; problem before it starts.
      </PageTitle>
      <Card className="p-6">
        <p className="text-sm text-muted">
          {submitted} of {group.size} submitted
          {group.status !== "locked" && submitted === group.size && " — ready to lock."}
        </p>
        <LinkButton href={`/g/${code}`} className="mt-4">
          Go to group status
        </LinkButton>
      </Card>
    </Container>
  );
}
