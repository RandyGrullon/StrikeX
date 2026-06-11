import { Select } from '@/components/Select';
import { useSelectedLeague } from '@/context/LeagueContext';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  finished: 'Finalizada',
};

/** Selector global de liga que se muestra arriba de cada pestaña */
export function LeaguePicker() {
  const { leagueId, leagues, setLeagueId } = useSelectedLeague();
  if (leagues.length <= 1) return null;

  return (
    <Select
      label="Liga"
      options={leagues.map((l) => ({
        label: l.name,
        value: l.id,
        sublabel: STATUS_LABEL[l.status],
      }))}
      value={leagueId}
      onChange={setLeagueId}
    />
  );
}
