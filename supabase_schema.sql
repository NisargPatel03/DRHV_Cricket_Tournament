-- ============================================================================
-- DRHV CRICKET TOURNAMENT MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Paste this in the Supabase SQL Editor to set up all tables and views.
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (User Roles & Profiles)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null default 'viewer' check (role in ('admin', 'scorer', 'viewer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

-- 2. TOURNAMENT SETTINGS TABLE
create table if not exists public.tournament_settings (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'DRHV Premier League',
  logo_url text,
  start_date date,
  end_date date,
  league_matches_per_team integer default 5,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Tournament Settings
alter table public.tournament_settings enable row level security;

-- 3. TEAMS TABLE
create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  short_name text not null unique,
  logo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Teams
alter table public.teams enable row level security;

-- 4. PLAYERS TABLE
create table if not exists public.players (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade,
  name text not null,
  role text not null check (role in ('batsman', 'bowler', 'all_rounder', 'wicket_keeper')),
  jersey_number integer,
  is_captain boolean default false,
  is_vice_captain boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Players
alter table public.players enable row level security;

-- 5. MATCHES TABLE
create table if not exists public.matches (
  id uuid default gen_random_uuid() primary key,
  team1_id uuid references public.teams(id) on delete cascade not null,
  team2_id uuid references public.teams(id) on delete cascade not null,
  match_date date not null,
  match_time time not null,
  venue text not null,
  stage text not null default 'league' check (stage in ('league', 'semifinal', 'final')),
  scorer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed', 'abandoned')),
  toss_winner_id uuid references public.teams(id),
  toss_decision text check (toss_decision in ('bat', 'bowl')),
  winner_id uuid references public.teams(id),
  result_margin text,
  man_of_the_match_id uuid references public.players(id),
  current_innings integer default 1,
  overs_limit integer default 20 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint teams_different check (team1_id != team2_id)
);

-- Enable RLS on Matches
alter table public.matches enable row level security;

-- 6. INNINGS TABLE
create table if not exists public.innings (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.matches(id) on delete cascade not null,
  innings_number integer not null check (innings_number in (1, 2)),
  batting_team_id uuid references public.teams(id) on delete cascade not null,
  bowling_team_id uuid references public.teams(id) on delete cascade not null,
  runs integer default 0 not null,
  wickets integer default 0 not null,
  total_balls integer default 0 not null,
  is_complete boolean default false not null,
  striker_id uuid references public.players(id) on delete set null,
  non_striker_id uuid references public.players(id) on delete set null,
  bowler_id uuid references public.players(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_match_innings unique (match_id, innings_number)
);

-- Enable RLS on Innings
alter table public.innings enable row level security;

-- 7. MATCH SQUADS TABLE (Playing XI confirmation)
create table if not exists public.match_squads (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.matches(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  player_id uuid references public.players(id) on delete cascade not null,
  is_playing_xi boolean default true not null,
  constraint unique_match_player unique (match_id, player_id)
);

-- Enable RLS on Match Squads
alter table public.match_squads enable row level security;

-- 8. BALLS TABLE (Ball-by-ball updates, enables SUPABASE REALTIME)
create table if not exists public.balls (
  id uuid default gen_random_uuid() primary key,
  innings_id uuid references public.innings(id) on delete cascade not null,
  over_number integer not null, -- 1-indexed (e.g. 1st over, 2nd over)
  ball_number integer not null, -- 1-indexed (e.g. 1, 2, 3, 4, 5, 6)
  batsman_id uuid references public.players(id) on delete cascade not null,
  bowler_id uuid references public.players(id) on delete cascade not null,
  non_striker_id uuid references public.players(id) on delete cascade not null,
  runs_batsman integer default 0 not null,
  runs_extras integer default 0 not null,
  extra_type text default 'none' check (extra_type in ('wide', 'no_ball', 'bye', 'leg_bye', 'none')),
  is_wicket boolean default false not null,
  wicket_type text check (wicket_type in ('bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired_hurt')),
  wicket_player_id uuid references public.players(id),
  fielder_id uuid references public.players(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Balls
alter table public.balls enable row level security;

-- 9. GALLERY TABLE
create table if not exists public.gallery (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.matches(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Gallery
alter table public.gallery enable row level security;

-- ============================================================================
-- AUTOMATED AUTH TO PROFILES TRIGGER
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_role text := 'viewer';
begin
  -- Check if we are registering the very first user, if so, make them admin!
  if not exists (select 1 from public.profiles) then
    default_role := 'admin';
  else
    default_role := coalesce(new.raw_user_meta_data->>'role', 'viewer');
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    default_role
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Profiles Policies
create policy "Public Profiles Read Access" on public.profiles for select using (true);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- Tournament Settings Policies
create policy "Public Settings Read" on public.tournament_settings for select using (true);
create policy "Admins manage tournament settings" on public.tournament_settings for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Teams Policies
create policy "Public Teams Read" on public.teams for select using (true);
create policy "Authenticated users can register teams" on public.teams for insert with check (auth.uid() is not null);
create policy "Admins manage teams" on public.teams for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Players Policies
create policy "Public Players Read" on public.players for select using (true);
create policy "Admins manage players" on public.players for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Matches Policies
create policy "Public Matches Read" on public.matches for select using (true);
create policy "Admins manage matches" on public.matches for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Scorers can update assigned matches" on public.matches for update using (
  scorer_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Innings Policies
create policy "Public Innings Read" on public.innings for select using (true);
create policy "Admins can manage innings" on public.innings for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Scorers can manage assigned innings" on public.innings for all using (
  exists (
    select 1 from public.matches
    where matches.id = innings.match_id
    and (matches.scorer_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  )
);

-- Match Squads Policies
create policy "Public Squads Read" on public.match_squads for select using (true);
create policy "Admins can manage squads" on public.match_squads for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Scorers can manage squads" on public.match_squads for all using (
  exists (
    select 1 from public.matches
    where matches.id = match_squads.match_id
    and (matches.scorer_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  )
);

-- Balls Policies
create policy "Public Balls Read" on public.balls for select using (true);
create policy "Admins can manage balls" on public.balls for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Scorers can manage balls" on public.balls for all using (
  exists (
    select 1 from public.innings
    join public.matches on matches.id = innings.match_id
    where innings.id = balls.innings_id
    and (matches.scorer_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  )
);

-- Gallery Policies
create policy "Public Gallery Read" on public.gallery for select using (true);
create policy "Admins can manage gallery" on public.gallery for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================================
-- POSTGRESQL REALTIME CONFIGURATION
-- Enable Postgres Realtime subscription for live matches & balls
-- ============================================================================

begin;
  -- Drop publication if exists to avoid conflicts, then recreate
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.balls;
alter publication supabase_realtime add table public.innings;
alter publication supabase_realtime add table public.matches;

-- ============================================================================
-- DATABASE VIEWS FOR DYNAMIC STATS (Points Table, Batsman Stats, Bowler Stats)
-- ============================================================================

-- 1. POINTS TABLE VIEW
create or replace view public.view_points_table as
with team_stats as (
  -- Aggregate stats as Team 1
  select
    t.id as team_id,
    t.name,
    t.logo_url,
    t.status,
    count(m.id) filter (where m.status = 'completed') as played,
    count(m.id) filter (where m.status = 'completed' and m.winner_id = t.id) as won,
    count(m.id) filter (where m.status = 'completed' and m.winner_id != t.id and m.winner_id is not null) as lost,
    count(m.id) filter (where m.status = 'abandoned' or (m.status = 'completed' and m.winner_id is null)) as no_result,
    coalesce(sum(i_bat.runs), 0) as runs_scored,
    coalesce(sum(i_bat.total_balls), 0) as balls_faced,
    coalesce(sum(i_bowl.runs), 0) as runs_conceded,
    coalesce(sum(i_bowl.total_balls), 0) as balls_bowled
  from public.teams t
  left join public.matches m on (m.team1_id = t.id or m.team2_id = t.id)
  left join public.innings i_bat on i_bat.match_id = m.id and i_bat.batting_team_id = t.id
  left join public.innings i_bowl on i_bowl.match_id = m.id and i_bowl.bowling_team_id = t.id
  where t.status = 'approved'
  group by t.id, t.name, t.logo_url, t.status
)
select
  team_id,
  name,
  logo_url,
  played,
  won,
  lost,
  no_result,
  (won * 2 + no_result * 1) as points,
  -- Net Run Rate Calculation: (runs_scored / overs_faced) - (runs_conceded / overs_bowled)
  -- Overs = balls / 6.0
  round(
    coalesce(
      (case when balls_faced = 0 then 0.0 else (runs_scored::numeric / (balls_faced::numeric / 6.0)) end) -
      (case when balls_bowled = 0 then 0.0 else (runs_conceded::numeric / (balls_bowled::numeric / 6.0)) end),
      0.0
    ),
    3
  ) as net_run_rate
from team_stats
order by points desc, net_run_rate desc;


-- 2. BATTING STATS VIEW
create or replace view public.view_batting_stats as
with player_balls as (
  select
    p.id as player_id,
    p.name as player_name,
    p.role as player_role,
    t.id as team_id,
    t.name as team_name,
    t.short_name as team_short,
    count(distinct m.id) filter (where m.status = 'completed' or m.status = 'live') as matches,
    coalesce(sum(b.runs_batsman), 0) as runs,
    count(b.id) filter (where b.extra_type != 'wide') as balls_faced,
    count(b.id) filter (where b.runs_batsman = 4) as fours,
    count(b.id) filter (where b.runs_batsman = 6) as sixes,
    -- Count of innings where this batsman got out
    count(b.id) filter (where b.is_wicket = true and b.wicket_player_id = p.id and b.wicket_type not in ('retired_hurt')) as dismissals
  from public.players p
  left join public.teams t on p.team_id = t.id
  left join public.match_squads ms on ms.player_id = p.id
  left join public.matches m on ms.match_id = m.id
  left join public.innings i on i.match_id = m.id
  left join public.balls b on b.innings_id = i.id and b.batsman_id = p.id
  group by p.id, p.name, p.role, t.id, t.name, t.short_name
),
player_high_scores as (
  -- Calculate High Score per player in a single innings
  select
    b.batsman_id as player_id,
    max(innings_runs.runs) as high_score
  from (
    select batsman_id, innings_id, sum(runs_batsman) as runs
    from public.balls
    group by batsman_id, innings_id
  ) innings_runs
  join public.balls b on b.batsman_id = innings_runs.batsman_id and b.innings_id = innings_runs.innings_id
  group by b.batsman_id
),
player_milestones as (
  -- Calculate 50s and 100s per player
  select
    batsman_id as player_id,
    count(1) filter (where runs >= 50 and runs < 100) as fifties,
    count(1) filter (where runs >= 100) as hundreds
  from (
    select batsman_id, innings_id, sum(runs_batsman) as runs
    from public.balls
    group by batsman_id, innings_id
  ) innings_runs
  group by batsman_id
)
select
  pb.player_id,
  pb.player_name,
  pb.player_role,
  pb.team_id,
  pb.team_name,
  pb.team_short,
  pb.matches,
  pb.runs,
  pb.balls_faced,
  coalesce(phs.high_score, 0) as high_score,
  round(
    case
      when pb.dismissals = 0 then pb.runs::numeric
      else pb.runs::numeric / pb.dismissals
    end,
    2
  ) as batting_average,
  round(
    case
      when pb.balls_faced = 0 then 0.0
      else (pb.runs::numeric * 100.0) / pb.balls_faced
    end,
    2
  ) as strike_rate,
  coalesce(pm.fifties, 0) as fifties,
  coalesce(pm.hundreds, 0) as hundreds,
  pb.fours,
  pb.sixes
from player_balls pb
left join player_high_scores phs on phs.player_id = pb.player_id
left join player_milestones pm on pm.player_id = pb.player_id
order by pb.runs desc;


-- 3. BOWLING STATS VIEW
create or replace view public.view_bowling_stats as
with bowler_balls as (
  select
    p.id as player_id,
    p.name as player_name,
    p.role as player_role,
    t.id as team_id,
    t.name as team_name,
    t.short_name as team_short,
    count(distinct m.id) filter (where m.status = 'completed' or m.status = 'live') as matches,
    -- Wickets credited to bowler (run out & retired hurt do not count towards bowler stats)
    count(b.id) filter (where b.is_wicket = true and b.wicket_type in ('bowled', 'caught', 'lbw', 'stumped', 'hit_wicket')) as wickets,
    -- Balls bowled (wides and no balls do not count as fair deliveries)
    count(b.id) filter (where b.extra_type not in ('wide', 'no_ball')) as balls_bowled,
    -- Runs conceded (batsman runs + wide + noball. byes & legbyes do not count against bowler)
    coalesce(sum(b.runs_batsman + (case when b.extra_type in ('wide', 'no_ball') then b.runs_extras else 0 end)), 0) as runs_conceded
  from public.players p
  left join public.teams t on p.team_id = t.id
  left join public.match_squads ms on ms.player_id = p.id
  left join public.matches m on ms.match_id = m.id
  left join public.innings i on i.match_id = m.id
  left join public.balls b on b.innings_id = i.id and b.bowler_id = p.id
  group by p.id, p.name, p.role, t.id, t.name, t.short_name
),
bowler_best as (
  -- Calculate Best Bowling Figures (Wickets/Runs Conceded in a single innings)
  select
    innings_bowler.bowler_id as player_id,
    concat(max(innings_bowler.wickets), '/', min(innings_bowler.runs_conceded) filter (where innings_bowler.wickets = max_wickets.w)) as best_figures
  from (
    select
      bowler_id,
      innings_id,
      count(1) filter (where is_wicket = true and wicket_type in ('bowled', 'caught', 'lbw', 'stumped', 'hit_wicket')) as wickets,
      sum(runs_batsman + (case when extra_type in ('wide', 'no_ball') then runs_extras else 0 end)) as runs_conceded
    from public.balls
    group by bowler_id, innings_id
  ) innings_bowler
  join (
    select bowler_id, max(wickets) as w
    from (
      select bowler_id, innings_id, count(1) filter (where is_wicket = true and wicket_type in ('bowled', 'caught', 'lbw', 'stumped', 'hit_wicket')) as wickets
      from public.balls
      group by bowler_id, innings_id
    ) ib
    group by bowler_id
  ) max_wickets on max_wickets.bowler_id = innings_bowler.bowler_id and max_wickets.w = innings_bowler.wickets
  group by innings_bowler.bowler_id
)
select
  bb.player_id,
  bb.player_name,
  bb.player_role,
  bb.team_id,
  bb.team_name,
  bb.team_short,
  bb.matches,
  bb.wickets,
  round((bb.balls_bowled::numeric / 6.0), 1) as overs,
  bb.runs_conceded,
  round(
    case
      when bb.wickets = 0 then bb.runs_conceded::numeric
      else bb.runs_conceded::numeric / bb.wickets
    end,
    2
  ) as bowling_average,
  round(
    case
      when bb.balls_bowled = 0 then 0.0
      else (bb.runs_conceded::numeric * 6.0) / bb.balls_bowled
    end,
    2
  ) as economy_rate,
  coalesce(best.best_figures, '0/0') as best_bowling
from bowler_balls bb
left join bowler_best best on best.player_id = bb.player_id
order by bb.wickets desc, economy_rate asc;


-- ============================================================================
-- SUPABASE STORAGE BUCKET CREATION & POLICIES FOR GALLERY PHOTOS
-- Paste this in the Supabase SQL Editor to configure bucket and storage RLS
-- ============================================================================

-- 1. Create the 'gallery' storage bucket if it does not already exist
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- 2. Policy to allow anyone (anonymous & authenticated) to download/view gallery photos
create policy "Allow Public Select on Gallery Bucket"
on storage.objects for select
using (bucket_id = 'gallery');

-- 3. Policy to allow authenticated users (specifically Admins) to upload gallery photos
create policy "Allow Authenticated Upload to Gallery Bucket"
on storage.objects for insert
with check (bucket_id = 'gallery' and auth.role() = 'authenticated');

-- 4. Policy to allow authenticated users (specifically Admins) to delete gallery photos
create policy "Allow Authenticated Delete from Gallery Bucket"
on storage.objects for delete
using (bucket_id = 'gallery' and auth.role() = 'authenticated');

