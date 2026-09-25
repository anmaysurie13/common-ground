import Link from "next/link";
import { inr } from "@/lib/format";
import type { ListingEvaluation } from "@/lib/matching/engine";
import type { Listing } from "@/lib/types";
import { Avatar, ListingThumb, PersonFit, ScoreRing } from "./match-ui";
import { Badge, Card } from "./ui";

export function ResultCard({
  code,
  listing,
  evaluation,
  index,
  discussBy,
}: {
  code: string;
  listing: Listing;
  evaluation: ListingEvaluation;
  index: number;
  discussBy: string[];
}) {
  return (
    <Card className="animate-rise overflow-hidden" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="grid md:grid-cols-[240px_1fr]">
        <ListingThumb listing={listing} className="h-36 w-full md:h-full" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-accent">Option {String.fromCharCode(65 + index)}</p>
              <h3 className="mt-1 text-lg font-semibold leading-snug">{listing.title}</h3>
              <p className="mt-1 text-sm text-muted">
                {listing.area} · {inr(listing.rent)}/mo · {inr(evaluation.rentShare)} each · {listing.bedrooms} bed · {listing.bathrooms} bath
              </p>
            </div>
            <ScoreRing value={evaluation.groupScore} label="group" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {evaluation.people.map((p) => (
              <span key={p.memberId} className="inline-flex items-center gap-1.5 rounded-full bg-canvas py-0.5 pl-0.5 pr-3 text-sm">
                <Avatar name={p.name} />
                <span className="text-muted">{p.name}</span>
                <span className="font-semibold tabular-nums">{p.score}</span>
              </span>
            ))}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {evaluation.people.map((p) => (
              <PersonFit key={p.memberId} person={p} compact />
            ))}
          </div>

          {evaluation.tradeoffs.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-warn">
              {evaluation.tradeoffs.map((t) => (
                <li key={t}>△ {t}</li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
            <div className="text-sm text-muted">
              {discussBy.length > 0 ? (
                <Badge tone="accent">Worth discussing · {discussBy.join(", ")}</Badge>
              ) : (
                "Clears every dealbreaker and must-have."
              )}
            </div>
            <Link href={`/g/${code}/listings/${listing.id}`} className="text-sm font-medium text-ink hover:text-accent">
              Full breakdown & discussion →
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
