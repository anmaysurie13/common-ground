import { redirect } from "next/navigation";
import { loadGroup } from "@/lib/group";
import { Card, Container, PageTitle } from "@/components/ui";
import { JoinForm } from "./join-form";

export default async function JoinPage({ params }: PageProps<"/g/[code]/join">) {
  const { code } = await params;
  const { group, members, me } = await loadGroup(code);
  const open = members.filter((m) => !m.name).length;
  const mine = me.find((m) => !m.submittedAt);
  if (mine && group.status !== "locked") redirect(`/g/${code}/preferences?member=${mine.id}`);

  return (
    <Container className="max-w-xl py-12">
      <PageTitle eyebrow="You're invited" title={`Join ${group.name}`}>
        Add your name, then tell us what you need from a flat. Your preferences are saved separately from everyone
        else&apos;s.
      </PageTitle>
      <Card className="p-6 sm:p-8">
        {group.status === "locked" ? (
          <p className="text-muted">This group has locked its preferences, so it isn&apos;t taking new members.</p>
        ) : open === 0 ? (
          <p className="text-muted">All {group.size} spots in this group have been claimed.</p>
        ) : (
          <JoinForm code={code} taken={members.filter((m) => m.name).map((m) => m.name!)} />
        )}
      </Card>
    </Container>
  );
}
