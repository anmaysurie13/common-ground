import { joinNames, type ListingEvaluation } from "./engine";

/** Plain-language summary built only from engine output. Used when Gemini is unavailable. */
export function summariseEvaluation(e: ListingEvaluation): string {
  if (!e.viable) {
    const out = e.people.filter((p) => p.status !== "works").map((p) => p.name);
    return `This flat doesn't work for ${joinNames(out)}. ${e.blockers[0] ?? ""}`.trim();
  }
  const parts = e.people.map((p) => {
    const compromises = p.checks.filter((c) => c.state === "compromise").map((c) => c.label.toLowerCase());
    return compromises.length
      ? `${p.name} would compromise on ${joinNames(compromises)}`
      : `${p.name} gets everything on their list`;
  });
  return `Clears every dealbreaker and must-have. ${parts.join("; ")}.`;
}
