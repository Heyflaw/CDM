export type Match = {
  id: number;
  round: string | null;
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  kickoff_at: string;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: number;
  home_pred: number;
  away_pred: number;
  points: number;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  total_points: number;
  exact_count: number;
  played_count: number;
};

// Statuts football-data.org considérés comme "match terminé".
export const FINISHED_STATUSES = ["FINISHED", "AWARDED"];

export function isFinished(status: string): boolean {
  return FINISHED_STATUSES.includes(status);
}

export function hasKickedOff(match: Pick<Match, "kickoff_at">): boolean {
  return new Date(match.kickoff_at).getTime() <= Date.now();
}
