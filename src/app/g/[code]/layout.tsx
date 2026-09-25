import { loadGroup } from "@/lib/group";
import { Badge, Container } from "@/components/ui";
import { GroupNav } from "./group-nav";

export default async function GroupLayout({ children, params }: LayoutProps<"/g/[code]">) {
  const { code } = await params;
  const { group, me } = await loadGroup(code);
  return (
    <div>
      <div className="border-b border-line/70 bg-surface/50">
        <Container className="pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{group.name}</h2>
            {group.isDemo && <Badge tone="accent">Demo</Badge>}
            {group.status === "locked" ? <Badge tone="good">Preferences locked</Badge> : <Badge>Collecting preferences</Badge>}
          </div>
          {me.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              {group.isDemo && me.length > 1 ? "Demo mode — you can act as anyone in the group." : `You're in as ${me.map((m) => m.name).join(", ")}.`}
            </p>
          )}
          <GroupNav code={code} />
        </Container>
      </div>
      {children}
    </div>
  );
}
