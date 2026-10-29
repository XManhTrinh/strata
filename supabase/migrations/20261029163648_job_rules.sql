-- A position's level range runs up one track: both ends on the same track, the lowest first.
-- The refusal's hint is the app's message key.

create function app.check_position_levels()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_min public.career_levels;
  v_max public.career_levels;
begin
  if new.min_level_id is null or new.max_level_id is null then
    return new;
  end if;
  select * into v_min from public.career_levels where id = new.min_level_id;
  select * into v_max from public.career_levels where id = new.max_level_id;
  if v_min.track is distinct from v_max.track or v_min.rank > v_max.rank then
    raise exception 'The lowest level must be on the same track as, and not above, the highest.'
      using errcode = 'check_violation', hint = 'positionLevelRange';
  end if;
  return new;
end;
$$;

create trigger check_position_levels
  before insert or update of min_level_id, max_level_id on public.positions
  for each row execute function app.check_position_levels();
