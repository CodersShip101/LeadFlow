-- Remember a user's individual plan before they joined a team, so removing them
-- (or the team cancelling) restores their previous tier instead of dropping
-- everyone to 'free'. Safe to re-run.
alter table public.profiles
  add column if not exists pre_team_status text;
