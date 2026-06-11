import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  AppNotification,
  GameScore,
  League,
  LeaguePlayer,
  Match,
  Matchday,
  MatchResult,
  PlayerStats,
  Profile,
  StandingRow,
  Team,
  Tournament,
  TournamentMatch,
  TournamentPlayer,
  WeeklyAverage,
} from '@/lib/types';

async function fetchAll<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as T;
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () =>
      fetchAll<Profile[]>(supabase.from('profiles').select('*').order('full_name')),
  });
}

export function useLeagues() {
  return useQuery({
    queryKey: ['leagues'],
    queryFn: () =>
      fetchAll<League[]>(
        supabase.from('leagues').select('*').order('created_at', { ascending: false })
      ),
  });
}

export function useLeague(id: string | null) {
  return useQuery({
    queryKey: ['leagues', id],
    enabled: !!id,
    queryFn: () =>
      fetchAll<League>(supabase.from('leagues').select('*').eq('id', id!).single()),
  });
}

export function useTeams(leagueId: string | null) {
  return useQuery({
    queryKey: ['teams', leagueId],
    enabled: !!leagueId,
    queryFn: () =>
      fetchAll<Team[]>(
        supabase.from('teams').select('*').eq('league_id', leagueId!).order('name')
      ),
  });
}

export function useLeaguePlayers(leagueId: string | null) {
  return useQuery({
    queryKey: ['league_players', leagueId],
    enabled: !!leagueId,
    queryFn: () =>
      fetchAll<LeaguePlayer[]>(
        supabase
          .from('league_players')
          .select('*')
          .eq('league_id', leagueId!)
          .order('display_name')
      ),
  });
}

export function usePlayerStats(leagueId: string | null) {
  return useQuery({
    queryKey: ['player_stats', leagueId],
    enabled: !!leagueId,
    queryFn: () =>
      fetchAll<PlayerStats[]>(
        supabase
          .from('player_stats')
          .select('*')
          .eq('league_id', leagueId!)
          .order('average', { ascending: false })
      ),
  });
}

export function useStandings(leagueId: string | null) {
  return useQuery({
    queryKey: ['standings', leagueId],
    enabled: !!leagueId,
    queryFn: () =>
      fetchAll<StandingRow[]>(
        supabase
          .from('standings')
          .select('*')
          .eq('league_id', leagueId!)
          .order('points', { ascending: false })
          .order('total_pinfall', { ascending: false })
      ),
  });
}

export function useMatchdays(leagueId: string | null) {
  return useQuery({
    queryKey: ['matchdays', leagueId],
    enabled: !!leagueId,
    queryFn: () =>
      fetchAll<Matchday[]>(
        supabase
          .from('matchdays')
          .select('*')
          .eq('league_id', leagueId!)
          .order('number')
      ),
  });
}

export function useMatches(leagueId: string | null) {
  return useQuery({
    queryKey: ['matches', leagueId],
    enabled: !!leagueId,
    queryFn: () =>
      fetchAll<Match[]>(
        supabase
          .from('matches')
          .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
          .eq('league_id', leagueId!)
      ),
  });
}

export function useMatch(matchId: string | null) {
  return useQuery({
    queryKey: ['match', matchId],
    enabled: !!matchId,
    queryFn: () =>
      fetchAll<Match>(
        supabase
          .from('matches')
          .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
          .eq('id', matchId!)
          .single()
      ),
  });
}

export function useMatchResults(leagueId: string | null) {
  return useQuery({
    queryKey: ['match_results', leagueId],
    enabled: !!leagueId,
    queryFn: () =>
      fetchAll<MatchResult[]>(
        supabase.from('match_results').select('*').eq('league_id', leagueId!)
      ),
  });
}

export function useScores(matchId: string | null) {
  return useQuery({
    queryKey: ['game_scores', matchId],
    enabled: !!matchId,
    queryFn: () =>
      fetchAll<GameScore[]>(
        supabase.from('game_scores').select('*').eq('match_id', matchId!)
      ),
  });
}

export function useWeeklyAverages(leagueId: string | null) {
  return useQuery({
    queryKey: ['weekly_averages', leagueId],
    enabled: !!leagueId,
    queryFn: () =>
      fetchAll<WeeklyAverage[]>(
        supabase
          .from('player_weekly_averages')
          .select('*')
          .eq('league_id', leagueId!)
          .order('matchday_number')
      ),
  });
}

export function useTournaments() {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: () =>
      fetchAll<Tournament[]>(
        supabase.from('tournaments').select('*').order('created_at', { ascending: false })
      ),
  });
}

export function useTournament(id: string | null) {
  return useQuery({
    queryKey: ['tournaments', id],
    enabled: !!id,
    queryFn: () =>
      fetchAll<Tournament>(supabase.from('tournaments').select('*').eq('id', id!).single()),
  });
}

export function useTournamentPlayers(tournamentId: string | null) {
  return useQuery({
    queryKey: ['tournament_players', tournamentId],
    enabled: !!tournamentId,
    queryFn: () =>
      fetchAll<TournamentPlayer[]>(
        supabase
          .from('tournament_players')
          .select('*, league_player:league_players(*)')
          .eq('tournament_id', tournamentId!)
      ),
  });
}

export function useTournamentMatches(tournamentId: string | null) {
  return useQuery({
    queryKey: ['tournament_matches', tournamentId],
    enabled: !!tournamentId,
    queryFn: () =>
      fetchAll<TournamentMatch[]>(
        supabase
          .from('tournament_matches')
          .select('*')
          .eq('tournament_id', tournamentId!)
          .order('round')
          .order('position')
      ),
  });
}

export function useNotifications(profileId: string | null) {
  return useQuery({
    queryKey: ['notifications', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const notifications = await fetchAll<AppNotification[]>(
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
      );
      const reads = await fetchAll<{ notification_id: string }[]>(
        supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('profile_id', profileId!)
      );
      const readSet = new Set(reads.map((r) => r.notification_id));
      return notifications.map((n) => ({ ...n, read: readSet.has(n.id) }));
    },
  });
}
