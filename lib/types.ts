export type Match = {
  id: number;
  round: string | null; // libellé affichable : "Groupe A", "8es de finale"…
  group_code: string | null; // 'A'..'L' en phase de groupes, null en élimination directe
  stage: string | null; // code brut : GROUP_STAGE, LAST_32, …, FINAL
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  kickoff_at: string;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
  winner: string | null; // 'HOME' | 'AWAY' | 'DRAW' | null (intègre les tirs au but)
  matchday: number | null; // 1..3 en phase de groupes, null en élimination directe
};

export type KnockoutPick = "HOME" | "AWAY";

// Prono bonus : les 8 meilleurs troisièmes qualifiés en 16es.
export type ThirdPlacePrediction = {
  user_id: string;
  teams: string[]; // exactement 8 équipes
  points: number;
};

// Prono d'élimination directe : on choisit l'équipe qui passe.
export type Prediction = {
  id: string;
  user_id: string;
  match_id: number;
  pick: KnockoutPick;
  points: number;
};

// Prono de phase de groupes : 1er et 2e d'un groupe.
export type GroupPrediction = {
  id: string;
  user_id: string;
  group_code: string;
  first_team: string;
  second_team: string;
  points: number;
};

// Classement officiel d'un groupe (alimenté par /api/sync).
export type Standing = {
  group_code: string;
  position: number;
  team: string;
  team_flag: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  total_points: number;
  correct_count: number; // nombre de pronos rapportant des points (groupes + élim.)
};

// Statuts football-data.org considérés comme "match terminé".
export const FINISHED_STATUSES = ["FINISHED", "AWARDED"];

export function isFinished(status: string): boolean {
  return FINISHED_STATUSES.includes(status);
}

export function hasKickedOff(match: Pick<Match, "kickoff_at">): boolean {
  return new Date(match.kickoff_at).getTime() <= Date.now();
}

export function isGroupMatch(m: Pick<Match, "group_code">): boolean {
  return m.group_code != null;
}
