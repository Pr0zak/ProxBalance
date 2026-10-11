// One-sentence explanations for the workload behaviour badges
// (Steady / Bursty / Growing / Cyclical), shared by the Guests table and the
// guest details modal so the wording stays the same everywhere.

export const BEHAVIOR_HINT = {
  steady: 'Steady: its CPU use stays close to its average, so its load is easy to plan around.',
  bursty: 'Bursty: it idles most of the time but spikes well above its average now and then.',
  growing: 'Growing: its CPU use has been climbing over the last days and may keep rising.',
  cyclical: 'Cyclical: its load rises and falls at the same times each day.',
  unknown: 'Not enough history yet to tell how its load behaves.',
};

/** Badge tooltip: the one-line meaning plus how sure the profile is. */
export function behaviorTitle(profile) {
  if (!profile) return '';
  const hint = BEHAVIOR_HINT[profile.behavior] || BEHAVIOR_HINT.unknown;
  const basis = profile.data_points
    ? ` Based on ${profile.data_points} samples${profile.confidence ? `, ${profile.confidence} confidence` : ''}.`
    : '';
  return `${hint}${basis}`;
}
