// Barème des pronostics — format hybride (groupes + élimination directe).
// Tout est centralisé ici : modifie ces constantes pour rééquilibrer le jeu.

// --- Phase de groupes : pronostic 1er / 2e de chaque groupe ---
export const GROUP_EXACT = 3; // bonne équipe à la bonne place
export const GROUP_SWAP = 1; // bonne équipe, mais place inversée
// → max 6 pts par groupe (les deux qualifiés trouvés dans le bon ordre)

// --- Élimination directe : bon qualifié, points croissants par tour ---
// Clés = codes "stage" bruts de football-data.org.
export const KNOCKOUT_POINTS: Record<string, number> = {
  LAST_32: 1, // 16es de finale (Round of 32)
  LAST_16: 2, // 8es de finale
  QUARTER_FINALS: 3, // quarts
  SEMI_FINALS: 5, // demies
  THIRD_PLACE: 2, // petite finale
  FINAL: 8, // finale
};
const KNOCKOUT_DEFAULT = 3; // filet de sécurité si un stage inconnu apparaît

// Points d'un prono de groupe (1er/2e) une fois le groupe terminé.
export function groupPredictionPoints(
  firstPred: string,
  secondPred: string,
  firstReal: string,
  secondReal: string
): number {
  let pts = 0;
  // 1re place prédite
  if (firstPred === firstReal) pts += GROUP_EXACT;
  else if (firstPred === secondReal) pts += GROUP_SWAP;
  // 2e place prédite
  if (secondPred === secondReal) pts += GROUP_EXACT;
  else if (secondPred === firstReal) pts += GROUP_SWAP;
  return pts;
}

// Points d'un prono d'élimination directe (« qui passe »).
export function knockoutPoints(stage: string, correct: boolean): number {
  if (!correct) return 0;
  return KNOCKOUT_POINTS[stage] ?? KNOCKOUT_DEFAULT;
}
