export type Role = 'admin' | 'player';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: Role;
  push_token: string | null;
  created_at: string;
}

export interface League {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'finished';
  start_date: string | null;
  end_date: string | null;
  games_per_series: number;
  handicap_base: number;
  handicap_percent: number;
  max_handicap: number | null;
  points_per_game: number;
  points_per_series: number;
  created_by: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  league_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface LeaguePlayer {
  id: string;
  league_id: string;
  team_id: string | null;
  profile_id: string | null;
  display_name: string;
  initial_average: number;
  is_active: boolean;
  created_at: string;
}

export interface Matchday {
  id: string;
  league_id: string;
  number: number;
  date: string;
  status: 'scheduled' | 'completed';
  created_at: string;
}

export interface Match {
  id: string;
  league_id: string;
  matchday_id: string;
  home_team_id: string;
  away_team_id: string;
  lanes: string | null;
  status: 'scheduled' | 'completed';
  created_at: string;
  home_team?: Team;
  away_team?: Team;
}

export interface GameScore {
  id: string;
  league_id: string;
  match_id: string;
  team_id: string;
  player_id: string;
  game_number: number;
  pinfall: number;
  handicap: number;
  created_at: string;
}

export interface PlayerStats {
  player_id: string;
  league_id: string;
  team_id: string | null;
  profile_id: string | null;
  display_name: string;
  is_active: boolean;
  games_played: number;
  total_pinfall: number;
  average: number;
  high_game: number;
  high_series: number;
  handicap: number;
}

export interface StandingRow {
  team_id: string;
  league_id: string;
  name: string;
  color: string | null;
  matches_played: number;
  points: number;
  points_against: number;
  total_pinfall: number;
}

export interface MatchResult {
  match_id: string;
  league_id: string;
  matchday_id: string;
  home_team_id: string;
  away_team_id: string;
  home_series: number;
  away_series: number;
  home_points: number;
  away_points: number;
}

export interface WeeklyAverage {
  player_id: string;
  league_id: string;
  matchday_number: number;
  date: string;
  average: number;
  series_total: number;
}

export interface Tournament {
  id: string;
  league_id: string | null;
  name: string;
  type: 'eliminacion' | 'puntos';
  status: 'open' | 'active' | 'finished';
  start_date: string | null;
  created_at: string;
}

export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  league_player_id: string;
  seed: number | null;
  league_player?: LeaguePlayer;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
  score1: number | null;
  score2: number | null;
  winner_id: string | null;
  status: 'pending' | 'completed';
}

export interface AppNotification {
  id: string;
  league_id: string | null;
  recipient_id: string | null;
  title: string;
  body: string;
  type: 'general' | 'resultado' | 'recordatorio' | 'torneo';
  created_by: string | null;
  created_at: string;
  read?: boolean;
}
