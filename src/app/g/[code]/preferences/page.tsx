import Link from "next/link";
import { aiEnabled } from "@/lib/gemini";
import { describePreferences } from "@/lib/describe";
import { displayName, loadGroupForRender } from "@/lib/group";
import { EMPTY_PREFERENCES } from "@/lib/validation";
import { Avatar } from "@/components/match-ui";
import { Card, Container, LinkButton, PageTitle, cn } from "@/components/ui";
import type { Member } from "@/lib/types";
import { PreferenceWizard } from "./preference-wizard";

export default async function PreferencesPage({ params, searchParams }: PageProps<"/g/[code]/preferences">) {
  const { code } = await params;
  const { member: memberParam } = await searchParams;
  const { group, members, me } = await loadGroupForRender(code);

  if (group.status === "locked") {
    return (
      <Container className="py-10">
        <PageTitle title="Everyone's constraints, side by side">
          Preferences are locked. This is the rulebook every listing is checked against.
        </PageTitle>
        <div className="grid gap-5 md:grid-cols-3">
          {members.map((m) => (
            <PreferenceSummary key={m.id} member={m} />
          ))}
        </div>
      </Container>
    );
  }

  if (me.length === 0) {
    return (
      <Container className="max-w-xl py-12">
        <PageTitle title="Preferences are private until everyone's done">
          Join the group to add yours. You&apos;ll see everyone&apos;s side by side once preferences are locked.
        </PageTitle>
        {members.some((m) => !m.name) && <LinkButton href={`/g/${code}/join`}>Join this group</LinkButton>}
      </Container>
    );
  }

  const current = me.find((m) => m.id === memberParam) ?? me.find((m) => !m.submittedAt) ?? me[0];

  return (
    <Container className="py-10">
      <PageTitle eyebrow={current.submittedAt ? "Submitted — you can still edit" : undefined} title={`${displayName(current)}'s preferences`}>
        Be honest about what you need. Clear constraints now prevent arguments later.
      </PageTitle>
      {me.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2" aria-label="Choose person">
          {me.map((m) => (
            <Link
              key={m.id}
              href={`/g/${code}/preferences?member=${m.id}`}
              className={cn(
                "flex items-center gap-2 rounded-full border py-1 pl-1 pr-4 text-sm font-medium transition",
                m.id === current.id ? "border-ink bg-surface" : "border-line text-muted hover:text-ink",
              )}
            >
              <Avatar name={displayName(m)} />
              {displayName(m)}
              {m.submittedAt && <span className="text-good">✓</span>}
            </Link>
          ))}
        </div>
      )}
      <PreferenceWizard
        key={current.id}
        code={code}
        memberId={current.id}
        memberName={displayName(current)}
        initial={current.preferences ?? EMPTY_PREFERENCES}
        aiEnabled={aiEnabled}
        alreadySubmitted={Boolean(current.submittedAt)}
      />
    </Container>
  );
}

function PreferenceSummary({ member }: { member: Member }) {
  if (!member.preferences) return null;
  const { dealbreakers, musts, prefs } = describePreferences(member.preferences);
  const section = (title: string, items: string[], dot: string) => (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-faint">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.length ? (
          items.map((i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", dot)} />
              {i}
            </li>
          ))
        ) : (
          <li className="text-muted">None</li>
        )}
      </ul>
    </div>
  );
  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center gap-3">
        <Avatar name={displayName(member)} size="md" />
        <p className="font-semibold">{displayName(member)}</p>
      </div>
      {section("Dealbreakers · no-go", dealbreakers, "bg-bad")}
      {section("Must-haves · need", musts, "bg-ink")}
      {section("Preferences · would like", prefs, "bg-accent")}
      {member.preferences.otherConstraints && (
        <p className="rounded-2xl bg-canvas/70 p-3 text-sm text-muted">“{member.preferences.otherConstraints}”</p>
      )}
    </Card>
  );
}
