import { createDemoAction } from "./actions";
import { Avatar, StateIcon } from "@/components/match-ui";
import { Button, Card, Container, LinkButton } from "@/components/ui";

const steps = [
  { n: "01", title: "Everyone submits privately", body: "Budget, areas, commute, must-haves and dealbreakers — before anyone sees a flat." },
  { n: "02", title: "Lock the inputs", body: "Nobody can quietly move the goalposts after falling for a listing." },
  { n: "03", title: "Add listings", body: "Paste in flats you find. Each is checked against all three people, the same way." },
  { n: "04", title: "See 2–3 viable options", body: "With exactly what each person gets and gives up. You decide together." },
];

export default function Home() {
  return (
    <>
      <Container className="grid items-center gap-12 pt-14 pb-20 sm:pt-20 lg:grid-cols-[1.1fr_1fr]">
        <div className="animate-rise">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
            <span className="size-1.5 rounded-full bg-accent" /> For friends renting together
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Find a flat everyone can actually agree on.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted text-pretty">
            Three people. Three sets of preferences. One transparent shortlist — with every compromise out in the open.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/new" className="h-12 px-6">
              Create a group
            </LinkButton>
            <form action={createDemoAction}>
              <Button variant="secondary" className="h-12 w-full px-6 sm:w-auto">
                Try the demo
              </Button>
            </form>
          </div>
          <p className="mt-4 text-sm text-faint">Demo: Riya, Meera and Kavita hunting for a 3BHK in Pune.</p>
        </div>

        <PreviewCard />
      </Container>

      <section className="border-y border-line/70 bg-surface/60">
        <Container className="grid gap-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">The usual way</h2>
            <ol className="mt-5 space-y-3 text-muted">
              {[
                "Someone finds a flat and gets excited.",
                "It goes into the group chat with five exclamation marks.",
                "Someone else spots the dealbreaker — no lift, too far, over budget.",
                "Argument. Repeat next weekend.",
              ].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 text-sm tabular-nums text-faint">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">With Common Ground</h2>
            <ol className="mt-5 space-y-3">
              {[
                "Everyone states their constraints first, separately.",
                "Every listing is checked objectively against all of them.",
                "Dealbreakers are caught before anyone gets attached.",
                "The group compares real trade-offs — and chooses together.",
              ].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 text-sm tabular-nums text-accent">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <Container className="py-16">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Card key={s.n} className="p-6">
              <p className="font-mono text-xs text-faint">{s.n}</p>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Definition term="Must-have" plain="need" body="Required. A flat without it isn't viable for you." />
          <Definition term="Dealbreaker" plain="no-go" body="Immediately rules a flat out for you — no discussion." />
          <Definition term="Preference" plain="would like" body="Nice to have. Negotiable, and weighed against everything else." />
        </div>
      </Container>
    </>
  );
}

function Definition({ term, plain, body }: { term: string; plain: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-line p-6">
      <p className="font-semibold">
        {term} <span className="font-normal text-muted">= {plain}</span>
      </p>
      <p className="mt-1.5 text-sm text-muted">{body}</p>
    </div>
  );
}

function PreviewCard() {
  const rows: { name: string; gets: string[]; gives: string[] }[] = [
    { name: "Riya", gets: ["30 min to Kothrud", "Preferred area"], gives: ["Pays ₹1,000 over ideal"] },
    { name: "Meera", gets: ["Lift", "2 bathrooms"], gives: ["Not furnished"] },
    { name: "Kavita", gets: ["25 min to Hinjewadi"], gives: ["Not pet-friendly"] },
  ];
  return (
    <Card className="animate-rise p-5 shadow-lift [animation-delay:120ms] sm:p-6" aria-label="Example result card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-accent">Viable option</p>
          <p className="mt-1 font-semibold">Sunny 3BHK off Pancard Club Road</p>
          <p className="text-sm text-muted">Baner · ₹45,000/mo · ₹15,000 each</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">85</p>
          <p className="text-xs text-muted">group match</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <div key={r.name} className="flex gap-3 rounded-2xl bg-canvas/70 p-3">
            <Avatar name={r.name} />
            <div className="text-sm">
              <p className="font-medium">{r.name}</p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {r.gets.map((g) => (
                  <span key={g} className="flex items-center gap-1.5">
                    <StateIcon state="met" /> {g}
                  </span>
                ))}
                {r.gives.map((g) => (
                  <span key={g} className="flex items-center gap-1.5">
                    <StateIcon state="compromise" /> {g}
                  </span>
                ))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
