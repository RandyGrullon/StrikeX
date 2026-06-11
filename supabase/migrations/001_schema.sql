-- ============================================================
-- StrikeX — Esquema completo para ligas de boliche
-- Correr en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- PERFILES ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  avatar_url text,
  role text not null default 'player' check (role in ('admin', 'player')),
  push_token text,
  created_at timestamptz not null default now()
);

-- El primer usuario registrado se vuelve admin automáticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when not exists (select 1 from public.profiles) then 'admin' else 'player' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- LIGAS ----------
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'finished')),
  start_date date,
  end_date date,
  games_per_series int not null default 3 check (games_per_series between 1 and 10),
  handicap_base int not null default 200,
  handicap_percent int not null default 80 check (handicap_percent between 0 and 100),
  max_handicap int,
  points_per_game numeric not null default 2,
  points_per_series numeric not null default 2,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- EQUIPOS ----------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

-- ---------- JUGADORES DE LIGA ----------
-- profile_id es opcional: permite registrar jugadores que aún no tienen cuenta
create table public.league_players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  initial_average int not null default 0 check (initial_average between 0 and 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- JORNADAS ----------
create table public.matchdays (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  number int not null,
  date date not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed')),
  created_at timestamptz not null default now(),
  unique (league_id, number)
);

-- ---------- PARTIDOS ----------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  matchday_id uuid not null references public.matchdays (id) on delete cascade,
  home_team_id uuid not null references public.teams (id) on delete cascade,
  away_team_id uuid not null references public.teams (id) on delete cascade,
  lanes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed')),
  created_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

-- ---------- PUNTAJES (pinfall por juego por jugador) ----------
-- handicap se guarda como snapshot al momento de capturar
create table public.game_scores (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id uuid not null references public.league_players (id) on delete cascade,
  game_number int not null check (game_number between 1 and 10),
  pinfall int not null check (pinfall between 0 and 300),
  handicap int not null default 0,
  created_at timestamptz not null default now(),
  unique (match_id, player_id, game_number)
);

-- ---------- TORNEOS ESPECIALES ----------
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues (id) on delete cascade,
  name text not null,
  type text not null default 'eliminacion' check (type in ('eliminacion', 'puntos')),
  status text not null default 'open' check (status in ('open', 'active', 'finished')),
  start_date date,
  created_at timestamptz not null default now()
);

create table public.tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  league_player_id uuid not null references public.league_players (id) on delete cascade,
  seed int,
  unique (tournament_id, league_player_id)
);

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  round int not null,
  position int not null,
  player1_id uuid references public.tournament_players (id) on delete set null,
  player2_id uuid references public.tournament_players (id) on delete set null,
  score1 int,
  score2 int,
  winner_id uuid references public.tournament_players (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  unique (tournament_id, round, position)
);

-- ---------- NOTIFICACIONES ----------
-- recipient_id null = broadcast (todos los usuarios)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues (id) on delete cascade,
  recipient_id uuid references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'general' check (type in ('general', 'resultado', 'recordatorio', 'torneo')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.notification_reads (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, profile_id)
);

-- ============================================================
-- VISTAS
-- ============================================================

-- Estadísticas por jugador: juegos, pinfall, promedio, handicap, altos
create or replace view public.player_stats
with (security_invoker = on) as
select
  lp.id as player_id,
  lp.league_id,
  lp.team_id,
  lp.profile_id,
  lp.display_name,
  lp.is_active,
  coalesce(g.games_played, 0) as games_played,
  coalesce(g.total_pinfall, 0) as total_pinfall,
  round(coalesce(g.average, lp.initial_average, 0), 2) as average,
  coalesce(g.high_game, 0) as high_game,
  coalesce(s.high_series, 0) as high_series,
  greatest(
    0,
    least(
      coalesce(l.max_handicap, 100000),
      floor(
        greatest(0, l.handicap_base - coalesce(g.average, lp.initial_average, 0))
        * l.handicap_percent / 100.0
      )
    )
  )::int as handicap
from public.league_players lp
join public.leagues l on l.id = lp.league_id
left join (
  select
    player_id,
    count(*) as games_played,
    sum(pinfall) as total_pinfall,
    avg(pinfall)::numeric as average,
    max(pinfall) as high_game
  from public.game_scores
  group by player_id
) g on g.player_id = lp.id
left join (
  select player_id, max(series_total) as high_series
  from (
    select player_id, match_id, sum(pinfall) as series_total
    from public.game_scores
    group by player_id, match_id
  ) x
  group by player_id
) s on s.player_id = lp.id;

-- Totales por equipo por juego dentro de un partido (scratch y con handicap)
create or replace view public.team_game_totals
with (security_invoker = on) as
select
  match_id,
  team_id,
  game_number,
  sum(pinfall) as scratch,
  sum(pinfall + handicap) as total
from public.game_scores
group by match_id, team_id, game_number;

-- Resultado de cada partido: puntos por juego ganado + puntos por serie
create or replace view public.match_results
with (security_invoker = on) as
with games as (
  select
    m.id as match_id,
    m.league_id,
    m.matchday_id,
    m.home_team_id,
    m.away_team_id,
    l.points_per_game,
    l.points_per_series,
    h.game_number,
    h.total as home_total,
    a.total as away_total
  from public.matches m
  join public.leagues l on l.id = m.league_id
  join public.team_game_totals h on h.match_id = m.id and h.team_id = m.home_team_id
  join public.team_game_totals a
    on a.match_id = m.id and a.team_id = m.away_team_id and a.game_number = h.game_number
),
game_pts as (
  select
    match_id, league_id, matchday_id, home_team_id, away_team_id, points_per_series,
    sum(case when home_total > away_total then points_per_game
             when home_total = away_total then points_per_game / 2
             else 0 end) as home_pts,
    sum(case when away_total > home_total then points_per_game
             when home_total = away_total then points_per_game / 2
             else 0 end) as away_pts,
    sum(home_total) as home_series,
    sum(away_total) as away_series
  from games
  group by match_id, league_id, matchday_id, home_team_id, away_team_id, points_per_series
)
select
  match_id, league_id, matchday_id, home_team_id, away_team_id, home_series, away_series,
  home_pts + case when home_series > away_series then points_per_series
                  when home_series = away_series then points_per_series / 2
                  else 0 end as home_points,
  away_pts + case when away_series > home_series then points_per_series
                  when home_series = away_series then points_per_series / 2
                  else 0 end as away_points
from game_pts;

-- Tabla de posiciones por equipo
create or replace view public.standings
with (security_invoker = on) as
with results as (
  select league_id, home_team_id as team_id, home_points as points,
         away_points as points_against, home_series as series
  from public.match_results
  union all
  select league_id, away_team_id, away_points, home_points, away_series
  from public.match_results
)
select
  t.id as team_id,
  t.league_id,
  t.name,
  t.color,
  count(r.team_id) as matches_played,
  coalesce(sum(r.points), 0) as points,
  coalesce(sum(r.points_against), 0) as points_against,
  coalesce(sum(r.series), 0) as total_pinfall
from public.teams t
left join results r on r.team_id = t.id and r.league_id = t.league_id
group by t.id, t.league_id, t.name, t.color;

-- Evolución del promedio por jornada (para gráficas)
create or replace view public.player_weekly_averages
with (security_invoker = on) as
select
  gs.player_id,
  gs.league_id,
  md.number as matchday_number,
  md.date,
  round(avg(gs.pinfall)::numeric, 2) as average,
  sum(gs.pinfall) as series_total
from public.game_scores gs
join public.matches m on m.id = gs.match_id
join public.matchdays md on md.id = m.matchday_id
group by gs.player_id, gs.league_id, md.number, md.date;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.league_players enable row level security;
alter table public.matchdays enable row level security;
alter table public.matches enable row level security;
alter table public.game_scores enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

-- Lectura: cualquier usuario autenticado puede ver los datos de las ligas
create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "read leagues" on public.leagues for select to authenticated using (true);
create policy "read teams" on public.teams for select to authenticated using (true);
create policy "read league_players" on public.league_players for select to authenticated using (true);
create policy "read matchdays" on public.matchdays for select to authenticated using (true);
create policy "read matches" on public.matches for select to authenticated using (true);
create policy "read game_scores" on public.game_scores for select to authenticated using (true);
create policy "read tournaments" on public.tournaments for select to authenticated using (true);
create policy "read tournament_players" on public.tournament_players for select to authenticated using (true);
create policy "read tournament_matches" on public.tournament_matches for select to authenticated using (true);

-- Perfiles: cada quien edita el suyo
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Escritura: solo administradores
create policy "admin write leagues" on public.leagues
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write teams" on public.teams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write league_players" on public.league_players
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write matchdays" on public.matchdays
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write matches" on public.matches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write game_scores" on public.game_scores
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write tournaments" on public.tournaments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write tournament_players" on public.tournament_players
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write tournament_matches" on public.tournament_matches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Notificaciones: cada quien ve las suyas + broadcasts; solo admin envía
create policy "read own notifications" on public.notifications
  for select to authenticated using (recipient_id is null or recipient_id = auth.uid());
create policy "admin send notifications" on public.notifications
  for insert to authenticated with check (public.is_admin());
create policy "admin manage notifications" on public.notifications
  for delete to authenticated using (public.is_admin());

create policy "read own reads" on public.notification_reads
  for select to authenticated using (profile_id = auth.uid());
create policy "mark as read" on public.notification_reads
  for insert to authenticated with check (profile_id = auth.uid());
