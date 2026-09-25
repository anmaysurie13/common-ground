import { inr } from "./format";
import type { Preferences } from "./types";

/** Groups a person's preferences the same way the matching engine treats them. */
export function describePreferences(p: Preferences) {
  const dealbreakers: string[] = [`Rent share over ${inr(p.budget.max)}`];
  const musts: string[] = [];
  const prefs: string[] = [];

  if (p.areas.excluded.length) dealbreakers.push(`Areas: ${p.areas.excluded.join(", ")}`);
  if (p.dealbreakers.noLift) dealbreakers.push("No lift");
  if (p.dealbreakers.noParking) dealbreakers.push("No parking");
  if (p.dealbreakers.notPetFriendly) dealbreakers.push("Not pet-friendly");
  if (p.dealbreakers.groundFloor) dealbreakers.push("Ground floor");

  const commute = `≤ ${p.commute.maxMinutes} min to ${p.commute.destination || "commute destination"}`;
  if (p.dealbreakers.commuteOverLimit) dealbreakers.push(`Commute over ${p.commute.maxMinutes} min to ${p.commute.destination}`);
  else if (p.commute.importance === "must") musts.push(commute);
  else if (p.commute.importance === "nice") prefs.push(commute);

  if (p.budget.ideal < p.budget.max) prefs.push(`Rent share around ${inr(p.budget.ideal)}`);
  if (p.areas.preferred.length) prefs.push(`Areas: ${p.areas.preferred.join(", ")}`);

  const feature = (imp: string, blocked: boolean, label: string) => {
    if (blocked) return;
    if (imp === "must") musts.push(label);
    else if (imp === "nice") prefs.push(label);
  };
  feature(p.lift, p.dealbreakers.noLift, "Lift");
  feature(p.parking, p.dealbreakers.noParking, "Parking");
  feature(p.petFriendly, p.dealbreakers.notPetFriendly, "Pet-friendly");
  feature(p.bathrooms.importance, false, `${p.bathrooms.min}+ bathrooms`);
  feature(p.furnishing.importance, false, p.furnishing.type.charAt(0).toUpperCase() + p.furnishing.type.slice(1));
  musts.push(...p.amenities.must);
  prefs.push(...p.amenities.nice);

  return { dealbreakers, musts, prefs };
}
