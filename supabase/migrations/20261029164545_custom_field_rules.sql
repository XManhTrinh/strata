-- Custom fields keep their key (imports and rate cards refer to it) and, once anyone has a value,
-- their type (values are stored for that type). Options belong to choice fields only.
-- Each refusal's hint is the app's message key.

create function app.check_custom_field_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.key <> old.key then
    raise exception 'A field''s key cannot change.'
      using errcode = 'check_violation', hint = 'fieldKeyFixed';
  end if;
  if new.type <> old.type
     and exists (select 1 from public.member_field_values v where v.field_id = new.id) then
    raise exception 'A field''s type cannot change once people have values.'
      using errcode = 'check_violation', hint = 'fieldTypeLocked';
  end if;
  return new;
end;
$$;

create trigger check_custom_field_change
  before update of key, type on public.custom_fields
  for each row execute function app.check_custom_field_change();

create function app.check_custom_field_option()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.custom_fields f
    where f.id = new.field_id and f.type in ('single_choice', 'multi_choice')
  ) then
    raise exception 'Only choice fields have options.'
      using errcode = 'check_violation', hint = 'fieldHasNoOptions';
  end if;
  return new;
end;
$$;

create trigger check_custom_field_option
  before insert on public.custom_field_options
  for each row execute function app.check_custom_field_option();
