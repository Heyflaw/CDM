// Barème classique des pronostics.
//   - Score exact                       -> 3 pts
//   - Bon résultat (1/N/2) mauvais score -> 1 pt
//   - Sinon                              -> 0 pt
export const POINTS_EXACT = 3;
export const POINTS_OUTCOME = 1;

function sign(a: number, b: number): -1 | 0 | 1 {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

export function computePoints(
  homePred: number,
  awayPred: number,
  homeGoals: number,
  awayGoals: number
): number {
  if (homePred === homeGoals && awayPred === awayGoals) return POINTS_EXACT;
  if (sign(homePred, awayPred) === sign(homeGoals, awayGoals)) {
    return POINTS_OUTCOME;
  }
  return 0;
}
