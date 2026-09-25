// All tunable matching weights live here. The UI reads these values to explain scoring,
// so changing a number here changes both the maths and the explanation.

export const MATCH_CONFIG = {
  /** Share of the 100-point individual score given to must-haves vs. preferences. */
  split: { mustHaves: 50, preferences: 50 },

  /** Relative weight of each negotiable preference. */
  preferenceWeights: {
    rent: 3,
    area: 3,
    commute: 3,
    bathrooms: 1.5,
    lift: 1,
    parking: 1,
    petFriendly: 1,
    furnishing: 1,
    amenity: 0.5,
  },

  /** Points subtracted from an individual score for each compromise. */
  compromisePenalty: 2,

  /** Rent between ideal and max still earns this fraction of the rent preference, at worst. */
  rentFloorAtMax: 0.3,

  /** A "nice to have" commute degrades to zero at this multiple of the stated limit. */
  commuteZeroAt: 1.5,

  /** How many viable options to surface. */
  shortlistSize: 3,

  /** Individual scores this far below the group's best are called out as an imbalance. */
  imbalanceThreshold: 15,
} as const;

export type MatchConfig = typeof MATCH_CONFIG;
