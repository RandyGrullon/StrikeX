import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { useLeagues } from '@/hooks/queries';
import type { League } from '@/lib/types';

interface LeagueState {
  leagueId: string | null;
  league: League | null;
  leagues: League[];
  setLeagueId: (id: string) => void;
}

const LeagueContext = createContext<LeagueState>({
  leagueId: null,
  league: null,
  leagues: [],
  setLeagueId: () => {},
});

/** Mantiene la liga seleccionada compartida entre todas las pestañas */
export function LeagueProvider({ children }: PropsWithChildren) {
  const { data: leagues = [] } = useLeagues();
  const [leagueId, setLeagueId] = useState<string | null>(null);

  useEffect(() => {
    if (!leagueId && leagues.length > 0) {
      const active = leagues.find((l) => l.status === 'active') ?? leagues[0]!;
      setLeagueId(active.id);
    }
  }, [leagues, leagueId]);

  return (
    <LeagueContext.Provider
      value={{
        leagueId,
        league: leagues.find((l) => l.id === leagueId) ?? null,
        leagues,
        setLeagueId,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
}

export const useSelectedLeague = () => useContext(LeagueContext);
