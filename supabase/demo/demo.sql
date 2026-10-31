-- Demo workspaces for trying Strata locally, owned by an existing account (never staging or
-- production): Personal-Mike (personal), Team-PLP (a team of ten) and Company-KIEU (about 120
-- people in divisions, departments and teams, with pay, custom fields, time off, rate cards and
-- plans), and COMPANY-Corp (about 10k people, for trying Strata at size). Run with
-- `pnpm db:demo you@example.com`. Re-running replaces these workspaces.

\set ON_ERROR_STOP on
set client_min_messages = warning;

select id as owner_user from auth.users where email = :'email' \gset
select set_config('demo.owner_user', :'owner_user', false);

-- Earlier copies go first. Guards (the Admin role, the root unit) refuse deletes, so user
-- triggers are off meanwhile; time rows point at people without cascading, so they go first.
do $$
declare
  v_slugs text[] := array['personal-mike', 'team-plp', 'company-kieu', 'company-corp'];
  t regclass;
begin
  if not exists (select 1 from public.workspaces where slug = any (v_slugs)) then
    return;
  end if;
  for t in select c.oid from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' loop
    execute format('alter table %s disable trigger user', t);
  end loop;
  delete from public.scenarios x using public.workspaces w where w.id = x.workspace_id and w.slug = any (v_slugs);
  delete from public.allowance_ledger l using public.workspaces w where w.id = l.workspace_id and w.slug = any (v_slugs);
  delete from public.bookings b using public.workspaces w where w.id = b.workspace_id and w.slug = any (v_slugs);
  delete from public.time_types x using public.workspaces w where w.id = x.workspace_id and w.slug = any (v_slugs);
  delete from public.workspaces where slug = any (v_slugs);
  for t in select c.oid from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' loop
    execute format('alter table %s enable trigger user', t);
  end loop;
end;
$$;

-- The workspaces, created by their owner through the app's own function.
select set_config('request.jwt.claims', json_build_object('sub', :'owner_user', 'role', 'authenticated')::text, false);
set role authenticated;
select public.create_workspace('Personal-Mike', 'personal-mike', 'personal', 'US', 'America/New_York', 'USD');
select public.create_workspace('Team-PLP', 'team-plp', 'team', 'US', 'America/New_York', 'USD');
select public.create_workspace('Company-KIEU', 'company-kieu', 'company', 'US', 'America/New_York', 'USD');
select public.create_workspace('COMPANY-Corp', 'company-corp', 'company', 'US', 'America/New_York', 'USD');
reset role;

-- Public holidays: the app generates them when a workspace is created in the browser; here they
-- are copied from the account's other US workspace with the most, when there is one.
insert into public.holidays (workspace_id, calendar_id, date, name, portion)
select c.workspace_id, c.id, h.date, h.name, h.portion
from public.holiday_calendars c
join public.workspaces w on w.id = c.workspace_id and w.slug in ('personal-mike', 'team-plp', 'company-kieu', 'company-corp')
cross join lateral (
  select src.id from public.holiday_calendars src
  join public.workspaces sw on sw.id = src.workspace_id
  where src.country = 'US' and sw.slug not in ('personal-mike', 'team-plp', 'company-kieu', 'company-corp')
  order by (select count(*) from public.holidays x where x.calendar_id = src.id) desc
  limit 1
) best
join public.holidays h on h.calendar_id = best.id
where c.is_default
on conflict do nothing;

-- Shared helpers ----------------------------------------------------------------------------------

create temporary table demo_names (n integer primary key, first text, last text);
insert into demo_names
select n,
  (array['Ana','Ben','Chloe','Daniel','Elena','Felix','Grace','Hugo','Ivy','Jack','Kira','Leo','Maya','Noah',
    'Olivia','Paul','Quinn','Rosa','Sam','Tara','Uma','Victor','Wendy','Xavier','Yara','Zane','Linh','Minh',
    'Huong','Duc','Lan','Tuan','Mai','Khoa','Thao','Priya','Arjun','Sofia','Mateo','Lucia','Omar','Fatima',
    'Kenji','Aiko','Lars','Ingrid','Diego','Camila','Ethan','Nora'])[1 + (n * 7) % 50],
  (array['Smith','Nguyen','Tran','Le','Pham','Johnson','Garcia','Martinez','Brown','Davis','Wilson','Anderson',
    'Thomas','Lee','Kim','Patel','Shah','Rossi','Muller','Silva','Costa','Novak','Kowalski','Ivanova','Sato',
    'Tanaka','Hoang','Vu','Dang','Bui','Murphy','Kelly','Walsh','Clarke','Lopez','Gonzalez','Perez','Sanchez',
    'Romero','Okafor'])[1 + (n * 11 + n / 50) % 40]
from generate_series(1, 10100) n;

/** The Monday on or after a date. */
create function pg_temp.monday(p_date date) returns date language sql immutable as
  $$ select p_date + ((8 - extract(isodow from p_date)::integer) % 7) $$;
grant execute on function pg_temp.monday(date) to authenticated;

-- Bookings for people without accounts, written directly: the booking, its attendee with
-- working days, approval rows, and allowance usage for leave. Each row of `demo_bookings`.
create temporary table demo_bookings (
  ws uuid, member_id uuid, type_name text, start_date date, end_date date, status public.booking_status,
  approver uuid, title text, recurrence text, attendees uuid[]
);

create function pg_temp.write_bookings() returns void language plpgsql as $$
declare
  b record;
  v_type public.time_types;
  v_id uuid;
  v_who uuid;
  v_days numeric;
begin
  for b in select * from demo_bookings loop
    select * into v_type from public.time_types where workspace_id = b.ws and name = b.type_name;
    insert into public.bookings (workspace_id, time_type_id, created_by, start_date, end_date, status, title, recurrence_rule)
    values (b.ws, v_type.id, b.member_id, b.start_date, b.end_date, b.status, b.title, b.recurrence)
    returning id into v_id;
    foreach v_who in array coalesce(b.attendees, array[b.member_id]) loop
      v_days := app.working_days(v_who, b.start_date, 'full', b.end_date, 'full');
      insert into public.booking_attendees (booking_id, workspace_id, member_id, working_days)
      values (v_id, b.ws, v_who, v_days);
      if v_type.uses_allowance and b.status in ('approved', 'pending') then
        insert into public.allowance_ledger (workspace_id, member_id, time_type_id, leave_year, kind, days, booking_id)
        values (b.ws, v_who, v_type.id, date_trunc('year', b.start_date)::date, 'usage', -v_days, v_id);
      end if;
    end loop;
    if v_type.needs_approval and b.approver is not null then
      insert into public.booking_approvals (workspace_id, booking_id, approver_member_id, decision, decided_by, decided_at)
      values (b.ws, v_id, b.approver,
        case b.status when 'approved' then 'approved' when 'rejected' then 'rejected' else 'pending' end::public.approval_decision,
        case when b.status in ('approved', 'rejected') then b.approver end,
        case when b.status in ('approved', 'rejected') then now() - interval '3 days' end);
    end if;
  end loop;
  truncate demo_bookings;
end;
$$;

-- Personal-Mike: your own leave, a sick day and a weekly event, booked through the app ---------
select w.id as personal_ws, (select id from public.members where workspace_id = w.id and is_owner) as personal_me
from public.workspaces w where w.slug = 'personal-mike' \gset
set role authenticated;
select public.book_time(:'personal_ws', (select id from public.time_types where workspace_id = :'personal_ws' and name = 'Annual leave'),
  array[:'personal_me'::uuid], pg_temp.monday(current_date + 21), pg_temp.monday(current_date + 21) + 4);
select public.book_time(:'personal_ws', (select id from public.time_types where workspace_id = :'personal_ws' and name = 'Annual leave'),
  array[:'personal_me'::uuid], date (extract(year from current_date)::integer + 1 || '-02-16'), date (extract(year from current_date)::integer + 1 || '-02-20'));
select public.book_time(:'personal_ws', (select id from public.time_types where workspace_id = :'personal_ws' and name = 'Sick leave'),
  array[:'personal_me'::uuid], pg_temp.monday(current_date - 20) + 2, pg_temp.monday(current_date - 20) + 2);
select public.book_time(:'personal_ws', (select id from public.time_types where workspace_id = :'personal_ws' and name = 'Event'),
  array[:'personal_me'::uuid], pg_temp.monday(current_date) + 1, pg_temp.monday(current_date) + 1,
  p_title => 'Gym', p_recurrence_rule => 'FREQ=WEEKLY;INTERVAL=1;UNTIL=' || to_char(current_date + 120, 'YYYYMMDD') || 'T235959Z');
reset role;

-- Team-PLP: nine people reporting to you, with leave, requests waiting for you and a sprint ------
select w.id as team_ws, (select id from public.members where workspace_id = w.id and is_owner) as team_me,
  (select id from public.org_units where workspace_id = w.id and parent_id is null) as team_root
from public.workspaces w where w.slug = 'team-plp' \gset

insert into public.positions (workspace_id, name)
select :'team_ws'::uuid, p from unnest(array['Product Lead', 'Developer', 'Senior Developer', 'Product Designer', 'QA Engineer', 'Data Analyst']) p;

create temporary table team_people as
select n, d.first || ' ' || d.last as name, lower(d.first || '.' || d.last || n) || '@plp.test' as email,
  (array['Senior Developer','Developer','Developer','Product Designer','QA Engineer','Data Analyst','Developer','Senior Developer','Developer'])[n - 200] as position,
  current_date - (120 + n * 41 % 900) as start_date
from demo_names d where d.n between 201 and 209;

insert into public.members (workspace_id, full_name, email, person_key, start_date)
select :'team_ws'::uuid, name, email, 'P-' || n, start_date from team_people;
insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id, manager_member_id, position_id, employment_type_id)
select :'team_ws'::uuid, m.id, p.start_date, :'team_root', :'team_me',
  (select id from public.positions where workspace_id = :'team_ws' and name = p.position),
  (select id from public.employment_types where workspace_id = :'team_ws' order by sort_order limit 1)
from team_people p join public.members m on m.workspace_id = :'team_ws' and m.email = p.email;
update public.member_assignments set position_id = (select id from public.positions where workspace_id = :'team_ws' and name = 'Product Lead')
where member_id = :'team_me';
insert into public.member_compensation (workspace_id, member_id, valid_from, annual_salary, currency)
select :'team_ws'::uuid, m.id, p.start_date, 95000 + (p.n % 7) * 6500, 'USD'
from team_people p join public.members m on m.workspace_id = :'team_ws' and m.email = p.email;

insert into demo_bookings (ws, member_id, type_name, start_date, end_date, status, approver)
select :'team_ws'::uuid, m.id, 'Annual leave', pg_temp.monday(current_date + 7 + (p.n * 9) % 60), pg_temp.monday(current_date + 7 + (p.n * 9) % 60) + 2 + p.n % 3,
  'approved'::public.booking_status, :'team_me'::uuid
from team_people p join public.members m on m.workspace_id = :'team_ws' and m.email = p.email where p.n % 2 = 1
union all
select :'team_ws'::uuid, m.id, 'Annual leave', pg_temp.monday(current_date + 35 + p.n % 20), pg_temp.monday(current_date + 35 + p.n % 20) + 1,
  'pending'::public.booking_status, :'team_me'::uuid
from team_people p join public.members m on m.workspace_id = :'team_ws' and m.email = p.email where p.n in (202, 205, 208)
union all
select :'team_ws'::uuid, m.id, 'Sick leave', pg_temp.monday(current_date - 30 - p.n % 40) + 1, pg_temp.monday(current_date - 30 - p.n % 40) + 1,
  'approved'::public.booking_status, null
from team_people p join public.members m on m.workspace_id = :'team_ws' and m.email = p.email where p.n % 3 = 0
union all
select :'team_ws'::uuid, m.id, 'Working from home', pg_temp.monday(current_date) + 4, pg_temp.monday(current_date) + 4, 'approved'::public.booking_status, null
from team_people p join public.members m on m.workspace_id = :'team_ws' and m.email = p.email where p.n % 4 = 0;
insert into demo_bookings (ws, member_id, type_name, start_date, end_date, status, title, recurrence, attendees)
select :'team_ws'::uuid, :'team_me', 'Team event', pg_temp.monday(current_date), pg_temp.monday(current_date), 'approved'::public.booking_status, 'Sprint planning',
  'FREQ=WEEKLY;INTERVAL=2;UNTIL=' || to_char(current_date + 180, 'YYYYMMDD') || 'T235959Z',
  array_append((select array_agg(m.id) from public.members m where m.workspace_id = :'team_ws' and not m.is_owner), :'team_me'::uuid);
select pg_temp.write_bookings();

-- Company-KIEU: about 120 people in three divisions ---------------------------------------------
select w.id as co_ws, (select id from public.members where workspace_id = w.id and is_owner) as co_me,
  (select id from public.org_units where workspace_id = w.id and parent_id is null) as co_root
from public.workspaces w where w.slug = 'company-kieu' \gset

insert into public.org_unit_levels (workspace_id, name, sort_order)
values (:'co_ws', 'Division', 10), (:'co_ws', 'Department', 20), (:'co_ws', 'Team', 30);

-- Units with their head (a person number) and the job of the people in each team.
create temporary table co_units (code text primary key, name text, parent text, level text, head integer, job text);
insert into co_units values
  ('ENG', 'Engineering', null, 'Division', 1, null),
  ('GTM', 'Go-to-market', null, 'Division', 2, null),
  ('OPS', 'Operations', null, 'Division', 3, null),
  ('ENG-PLT', 'Platform', 'ENG', 'Department', 4, null),
  ('ENG-PRD', 'Product Engineering', 'ENG', 'Department', 5, null),
  ('GTM-SAL', 'Sales', 'GTM', 'Department', 6, null),
  ('GTM-MKT', 'Marketing', 'GTM', 'Department', 7, null),
  ('OPS-PPL', 'People', 'OPS', 'Department', 8, null),
  ('OPS-FIN', 'Finance', 'OPS', 'Department', 9, null),
  ('ENG-PLT-INF', 'Infrastructure', 'ENG-PLT', 'Team', 10, 'Site Reliability Engineer'),
  ('ENG-PLT-DAT', 'Data', 'ENG-PLT', 'Team', 11, 'Data Engineer'),
  ('ENG-PRD-WEB', 'Web', 'ENG-PRD', 'Team', 12, 'Software Engineer'),
  ('ENG-PRD-MOB', 'Mobile', 'ENG-PRD', 'Team', 13, 'Mobile Engineer'),
  ('ENG-PRD-DES', 'Design', 'ENG-PRD', 'Team', 14, 'Product Designer'),
  ('GTM-SAL-ENT', 'Enterprise', 'GTM-SAL', 'Team', 15, 'Account Executive'),
  ('GTM-SAL-SMB', 'SMB', 'GTM-SAL', 'Team', 16, 'Sales Development Rep'),
  ('GTM-MKT-GRO', 'Growth', 'GTM-MKT', 'Team', 17, 'Growth Marketer'),
  ('OPS-PPL-TAL', 'Talent', 'OPS-PPL', 'Team', 18, 'Recruiter'),
  ('OPS-FIN-FPA', 'FP&A', 'OPS-FIN', 'Team', 19, 'Financial Analyst');

insert into public.org_units (workspace_id, parent_id, level_id, name, code)
select :'co_ws'::uuid, :'co_root', (select id from public.org_unit_levels where workspace_id = :'co_ws' and name = 'Division'), name, code
from co_units where level = 'Division';
insert into public.org_units (workspace_id, parent_id, level_id, name, code)
select :'co_ws'::uuid, p.id, (select id from public.org_unit_levels where workspace_id = :'co_ws' and name = 'Department'), u.name, u.code
from co_units u join public.org_units p on p.workspace_id = :'co_ws' and p.code = u.parent where u.level = 'Department';
insert into public.org_units (workspace_id, parent_id, level_id, name, code)
select :'co_ws'::uuid, p.id, (select id from public.org_unit_levels where workspace_id = :'co_ws' and name = 'Team'), u.name, u.code
from co_units u join public.org_units p on p.workspace_id = :'co_ws' and p.code = u.parent where u.level = 'Team';

insert into public.career_levels (workspace_id, name, rank, track) values
  (:'co_ws', 'IC1', 1, 'Individual contributor'), (:'co_ws', 'IC2', 2, 'Individual contributor'),
  (:'co_ws', 'IC3', 3, 'Individual contributor'), (:'co_ws', 'IC4', 4, 'Individual contributor'),
  (:'co_ws', 'IC5', 5, 'Individual contributor'),
  (:'co_ws', 'M1', 6, 'Manager'), (:'co_ws', 'M2', 7, 'Manager'), (:'co_ws', 'M3', 8, 'Manager');

-- People: heads 1-19 lead their unit; 20-119 work in the ten teams. Who reports to whom follows
-- the units, and division heads report to you.
create temporary table co_people as
with base as (
  select n,
    case when n <= 19 then (select code from co_units where head = n)
         else (select code from co_units where level = 'Team' order by head offset (n - 20) % 10 limit 1) end as unit
  from generate_series(1, 119) n
)
select b.n, d.first || ' ' || d.last as name, lower(d.first || '.' || d.last || b.n) || '@kieu.test' as email, b.unit,
  case when b.n <= 3 then 'VP, ' || u.name
       when b.n <= 9 then 'Director of ' || u.name
       when b.n <= 19 then u.name || ' Lead'
       when b.n % 4 = 0 then 'Senior ' || u.job
       else u.job end as position,
  case when b.n <= 3 then 'M3' when b.n <= 9 then 'M2' when b.n <= 19 then 'M1'
       when b.n % 4 = 0 then (array['IC4', 'IC5'])[1 + b.n % 2]
       else (array['IC1', 'IC2', 'IC3'])[1 + b.n % 3] end as level,
  case when b.n > 19 and b.n % 7 = 0 then 'Contractor' else 'Employee' end as employment_type,
  (array['New York', 'Austin', 'Remote'])[1 + b.n % 3] as location,
  case when b.unit like 'ENG%' and b.n % 3 <> 0 then 'Capex' else 'Opex' end as cost_type,
  'Band ' || (1 + b.n % 5) as band,
  current_date - (90 + (b.n * 37) % 2200) as start_date,
  case when b.n in (23, 57, 91) then current_date - (15 + b.n % 60) end as end_date
from base b join demo_names d on d.n = b.n join co_units u on u.code = b.unit;

insert into public.positions (workspace_id, name)
select distinct :'co_ws'::uuid, position from co_people
union select :'co_ws'::uuid, 'Chief Executive Officer';

insert into public.members (workspace_id, full_name, email, person_key, start_date, end_date, status)
select :'co_ws'::uuid, name, email, 'K-' || lpad(n::text, 4, '0'), start_date, end_date,
  case when end_date is null then 'active' else 'inactive' end::public.member_status
from co_people;
create temporary table co_ids as
select p.*, m.id as member_id, u.id as unit_id
from co_people p join public.members m on m.workspace_id = :'co_ws' and m.email = p.email
join public.org_units u on u.workspace_id = :'co_ws' and u.code = p.unit;

-- A fifth were promoted a year after joining: an earlier job record a level lower.
insert into public.member_assignments (workspace_id, member_id, valid_from, valid_to, org_unit_id, position_id, career_level_id, employment_type_id)
select :'co_ws'::uuid, p.member_id, p.start_date, p.start_date + 365, p.unit_id,
  (select id from public.positions where workspace_id = :'co_ws' and name = replace(p.position, 'Senior ', '')),
  (select id from public.career_levels where workspace_id = :'co_ws' and name = 'IC3'),
  (select id from public.employment_types where workspace_id = :'co_ws' and name = p.employment_type)
from co_ids p where p.n > 19 and p.n % 4 = 0 and p.start_date + 365 < current_date;
insert into public.member_assignments (workspace_id, member_id, valid_from, valid_to, org_unit_id, manager_member_id, position_id, career_level_id, employment_type_id)
select :'co_ws'::uuid, p.member_id,
  case when p.n > 19 and p.n % 4 = 0 and p.start_date + 365 < current_date then p.start_date + 365 else p.start_date end,
  p.end_date + 1,
  p.unit_id,
  case when p.n <= 3 then :'co_me'::uuid
       else (select h.member_id from co_ids h
             where h.n = (select head from co_units where code = case when p.n <= 19 then (select parent from co_units where head = p.n) else p.unit end)) end,
  (select id from public.positions where workspace_id = :'co_ws' and name = p.position),
  (select id from public.career_levels where workspace_id = :'co_ws' and name = p.level),
  (select id from public.employment_types where workspace_id = :'co_ws' and name = p.employment_type)
from co_ids p;
update public.member_assignments set
  position_id = (select id from public.positions where workspace_id = :'co_ws' and name = 'Chief Executive Officer'),
  career_level_id = (select id from public.career_levels where workspace_id = :'co_ws' and name = 'M3')
where member_id = :'co_me';

insert into public.member_compensation (workspace_id, member_id, valid_from, annual_salary, day_rate, currency)
select :'co_ws'::uuid, p.member_id, p.start_date,
  case when p.employment_type = 'Employee' then
    (case p.level when 'IC1' then 85000 when 'IC2' then 105000 when 'IC3' then 125000 when 'IC4' then 150000
       when 'IC5' then 175000 when 'M1' then 165000 when 'M2' then 195000 else 240000 end) + (p.n % 9) * 1500 end,
  case when p.employment_type = 'Contractor' then 550 + (p.n % 5) * 75 end,
  'USD'
from co_ids p;

-- Custom fields: where people work, how their cost counts (the plan's cost split), and band.
insert into public.custom_fields (workspace_id, key, label, type, sensitive, sort_order) values
  (:'co_ws', 'location', 'Location', 'single_choice', false, 10),
  (:'co_ws', 'cost_type', 'Cost type', 'single_choice', false, 20),
  (:'co_ws', 'band', 'Band', 'text', true, 30);
insert into public.custom_field_options (workspace_id, field_id, label, sort_order)
select :'co_ws'::uuid, f.id, o.label, o.sort
from public.custom_fields f
join (values ('location', 'New York', 10), ('location', 'Austin', 20), ('location', 'Remote', 30),
  ('cost_type', 'Capex', 10), ('cost_type', 'Opex', 20)) o (key, label, sort) on o.key = f.key
where f.workspace_id = :'co_ws';
insert into public.member_field_values (workspace_id, member_id, field_id, value)
select :'co_ws'::uuid, p.member_id, f.id,
  to_jsonb(case f.key when 'location' then p.location when 'cost_type' then p.cost_type else p.band end)
from co_ids p join public.custom_fields f on f.workspace_id = :'co_ws';
update public.planning_settings
set cost_split_field_id = (select id from public.custom_fields where workspace_id = :'co_ws' and key = 'cost_type')
where workspace_id = :'co_ws';

-- Time off: leave this year and ahead, requests waiting (two of them for you), sick days,
-- training, and a monthly all-hands for everyone.
create temporary table co_managers as
select p.member_id, a.manager_member_id as manager
from co_ids p join public.member_assignments a on a.member_id = p.member_id and a.valid_to is null;
insert into demo_bookings (ws, member_id, type_name, start_date, end_date, status, approver)
select :'co_ws'::uuid, p.member_id, 'Annual leave',
  pg_temp.monday(current_date + 7 + (p.n * 9) % 80), pg_temp.monday(current_date + 7 + (p.n * 9) % 80) + 2 + p.n % 3,
  'approved'::public.booking_status, m.manager
from co_ids p join co_managers m using (member_id) where p.end_date is null and p.n % 3 = 0
union all
select :'co_ws'::uuid, p.member_id, 'Annual leave',
  pg_temp.monday(current_date - 30 - (p.n * 13) % 200), pg_temp.monday(current_date - 30 - (p.n * 13) % 200) + 4,
  'approved'::public.booking_status, m.manager
from co_ids p join co_managers m using (member_id) where p.n % 4 = 1 and pg_temp.monday(current_date - 30 - (p.n * 13) % 200) > p.start_date
union all
select :'co_ws'::uuid, p.member_id, 'Annual leave',
  pg_temp.monday(current_date + 40 + p.n % 30), pg_temp.monday(current_date + 40 + p.n % 30) + 1,
  'pending'::public.booking_status, m.manager
from co_ids p join co_managers m using (member_id) where p.end_date is null and (p.n % 10 = 3 or p.n in (1, 2))
union all
select :'co_ws'::uuid, p.member_id, 'Sick leave', pg_temp.monday(current_date - 10 - (p.n * 7) % 90) + p.n % 5,
  pg_temp.monday(current_date - 10 - (p.n * 7) % 90) + p.n % 5, 'approved'::public.booking_status, null
from co_ids p where p.n % 11 = 0
union all
select :'co_ws'::uuid, p.member_id, 'Training', pg_temp.monday(current_date + 14 + p.n % 50) + 1,
  pg_temp.monday(current_date + 14 + p.n % 50) + 2, 'approved'::public.booking_status, m.manager
from co_ids p join co_managers m using (member_id) where p.end_date is null and p.n % 13 = 0;
insert into demo_bookings (ws, member_id, type_name, start_date, end_date, status, title, recurrence, attendees)
select :'co_ws'::uuid, :'co_me', 'Team event', pg_temp.monday(date_trunc('month', current_date + 31)::date) + 3,
  pg_temp.monday(date_trunc('month', current_date + 31)::date) + 3, 'approved'::public.booking_status, 'All-hands',
  'FREQ=MONTHLY;INTERVAL=1;UNTIL=' || to_char(current_date + 365, 'YYYYMMDD') || 'T235959Z',
  array_append((select array_agg(member_id) from co_ids where end_date is null), :'co_me'::uuid);
select pg_temp.write_bookings();

-- Planning: rate cards, then a plan from people with open roles, approved and live, and a
-- growth copy still in draft.
insert into public.rate_cards (workspace_id, name, priority, is_default) values
  (:'co_ws', 'Contractors', 10, false), (:'co_ws', 'Senior engineering', 20, false),
  (:'co_ws', 'Engineering', 30, false), (:'co_ws', 'Go-to-market', 40, false), (:'co_ws', 'Everyone else', 99, true);
insert into public.rate_card_conditions (workspace_id, card_id, field, operator, value, sort_order)
select :'co_ws'::uuid, r.id, c.field, c.op::public.rate_operator, c.value, c.sort
from public.rate_cards r
join (values ('Contractors', 'employment_type', 'equals', 'Contractor', 10),
  ('Senior engineering', 'unit_code', 'starts_with', 'ENG', 10),
  ('Senior engineering', 'career_level', 'in', 'IC4, IC5, M1, M2, M3', 20),
  ('Engineering', 'unit_code', 'starts_with', 'ENG', 10),
  ('Go-to-market', 'unit_code', 'starts_with', 'GTM', 10)) c (card, field, op, value, sort) on c.card = r.name
where r.workspace_id = :'co_ws';
insert into public.rate_card_rates (workspace_id, card_id, valid_from, day_rate, working_days, currency)
select :'co_ws'::uuid, r.id, m.month, round(v.rate * m.raise), 21, 'USD'
from public.rate_cards r
join (values ('Contractors', 720), ('Senior engineering', 640), ('Engineering', 520), ('Go-to-market', 480)) v (card, rate) on v.card = r.name
cross join (values (date_trunc('month', current_date)::date, 1.0),
  (date_trunc('year', current_date + 366)::date, 1.03)) m (month, raise)
where r.workspace_id = :'co_ws';

set role authenticated;
select public.create_scenario(:'co_ws', 'FY plan', date_trunc('month', current_date)::date,
  (date_trunc('year', current_date + 366) + interval '11 months')::date) as co_plan \gset
reset role;
insert into public.planned_roles (workspace_id, scenario_id, title, org_unit_id, position_id, career_level_id, employment_type_id, start_date, fte)
select :'co_ws'::uuid, :'co_plan', r.title, u.id,
  (select id from public.positions where workspace_id = :'co_ws' and name = r.position),
  (select id from public.career_levels where workspace_id = :'co_ws' and name = r.level),
  (select id from public.employment_types where workspace_id = :'co_ws' and name = 'Employee'),
  date_trunc('month', current_date + r.months * 31)::date, r.fte
from (values ('Senior Software Engineer', 'ENG-PRD-WEB', 'Senior Software Engineer', 'IC4', 2, 1.0),
  ('Data Engineer', 'ENG-PLT-DAT', 'Data Engineer', 'IC3', 3, 1.0),
  ('Account Executive', 'GTM-SAL-ENT', 'Account Executive', 'IC3', 2, 1.0),
  ('Recruiter (part time)', 'OPS-PPL-TAL', 'Recruiter', 'IC2', 1, 0.5)) r (title, unit, position, level, months, fte)
join public.org_units u on u.workspace_id = :'co_ws' and u.code = r.unit;
set role authenticated;
select public.apply_rate_cards(:'co_plan');
select public.set_scenario_status(:'co_plan', 'submitted');
select public.set_scenario_status(:'co_plan', 'approved');
select public.set_live_scenario(:'co_plan');
select public.copy_scenario(:'co_plan', 'FY plan: growth') as co_growth \gset
reset role;
insert into public.planned_roles (workspace_id, scenario_id, title, org_unit_id, position_id, career_level_id, employment_type_id, start_date, fte)
select :'co_ws'::uuid, :'co_growth', r.title, u.id,
  (select id from public.positions where workspace_id = :'co_ws' and name = r.position),
  (select id from public.career_levels where workspace_id = :'co_ws' and name = r.level),
  (select id from public.employment_types where workspace_id = :'co_ws' and name = 'Employee'),
  date_trunc('month', current_date + r.months * 31)::date, 1
from (values ('Mobile Engineer', 'ENG-PRD-MOB', 'Mobile Engineer', 'IC3', 4), ('Mobile Engineer', 'ENG-PRD-MOB', 'Mobile Engineer', 'IC2', 6),
  ('Site Reliability Engineer', 'ENG-PLT-INF', 'Site Reliability Engineer', 'IC4', 5),
  ('Growth Marketer', 'GTM-MKT-GRO', 'Growth Marketer', 'IC3', 3)) r (title, unit, position, level, months)
join public.org_units u on u.workspace_id = :'co_ws' and u.code = r.unit;
set role authenticated;
select public.apply_rate_cards(:'co_growth');
reset role;
-- COMPANY-Corp: about 10k people in 4 divisions, 16 departments and 80 teams -----------------
select w.id as corp_ws, (select id from public.members where workspace_id = w.id and is_owner) as corp_me,
  (select id from public.org_units where workspace_id = w.id and parent_id is null) as corp_root
from public.workspaces w where w.slug = 'company-corp' \gset

insert into public.org_unit_levels (workspace_id, name, sort_order)
values (:'corp_ws', 'Division', 10), (:'corp_ws', 'Department', 20), (:'corp_ws', 'Team', 30);

-- Units by number: divisions 1-4, departments 5-20 (four each), teams 21-100 (five each).
create temporary table corp_units as
with d as (
  select n, (array['Engineering', 'Commercial', 'Product', 'Operations'])[n] as name, 'C' || n as code
  from generate_series(1, 4) n
), dep as (
  select 4 + (d.n - 1) * 4 + k as n, d.n as parent,
    (array[array['Platform', 'Payments', 'Mobile', 'Data'], array['Sales', 'Partnerships', 'Customer Success', 'Marketing'],
      array['Design', 'Research', 'Product Management', 'Analytics'], array['People', 'Finance', 'Legal', 'Workplace']])[d.n][k] as name,
    d.code || '-' || k as code
  from d cross join generate_series(1, 4) k
), team as (
  select 20 + (dep.n - 5) * 5 + k as n, dep.n as parent,
    dep.name || ' ' || (array['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'])[k] as name, dep.code || '-' || k as code
  from dep cross join generate_series(1, 5) k
)
select n, null::integer as parent, name, code, 'Division' as level from d
union all select n, parent, name, code, 'Department' from dep
union all select n, parent, name, code, 'Team' from team;

insert into public.org_units (workspace_id, parent_id, level_id, name, code)
select :'corp_ws', :'corp_root', (select id from public.org_unit_levels where workspace_id = :'corp_ws' and name = 'Division'), name, code
from corp_units where level = 'Division';
insert into public.org_units (workspace_id, parent_id, level_id, name, code)
select :'corp_ws', p.id, (select id from public.org_unit_levels where workspace_id = :'corp_ws' and name = u.level), u.name, u.code
from corp_units u join corp_units pu on pu.n = u.parent
join public.org_units p on p.workspace_id = :'corp_ws' and p.code = pu.code where u.level = 'Department';
insert into public.org_units (workspace_id, parent_id, level_id, name, code)
select :'corp_ws', p.id, (select id from public.org_unit_levels where workspace_id = :'corp_ws' and name = u.level), u.name, u.code
from corp_units u join corp_units pu on pu.n = u.parent
join public.org_units p on p.workspace_id = :'corp_ws' and p.code = pu.code where u.level = 'Team';

insert into public.career_levels (workspace_id, name, rank, track)
select :'corp_ws', name, rank, track from public.career_levels
where workspace_id = (select id from public.workspaces where slug = 'company-kieu');
insert into public.positions (workspace_id, name)
select :'corp_ws', p from unnest(array['Chief Executive Officer', 'Vice President', 'Director', 'Team Lead',
  'Engineer', 'Senior Engineer', 'Analyst', 'Senior Analyst', 'Specialist', 'Senior Specialist', 'Designer', 'Manager']) p;

-- Person n: 1-100 lead unit n; the rest sit in team 21 + n mod 80.
create temporary table corp_people as
select n, d.first || ' ' || d.last as name, lower(d.first || '.' || d.last || '.' || n) || '@corp.test' as email,
  case when n <= 100 then n else 21 + n % 80 end as unit_n,
  case when n <= 4 then 'Vice President' when n <= 20 then 'Director' when n <= 100 then 'Team Lead'
       else (array['Engineer', 'Senior Engineer', 'Analyst', 'Senior Analyst', 'Specialist', 'Senior Specialist', 'Designer'])[1 + n % 7] end as position,
  case when n <= 4 then 'M3' when n <= 20 then 'M2' when n <= 100 then 'M1'
       else (array['IC1', 'IC2', 'IC3', 'IC4', 'IC5'])[1 + n % 5] end as level,
  case when n > 100 and n % 9 = 0 then 'Contractor' else 'Employee' end as employment_type,
  current_date - (60 + (n * 37) % 3000) as start_date,
  -- Leavers left after they started.
  case when n > 100 and n % 97 = 0 and (n * 37) % 3000 > 300 then current_date - (10 + n % 200) end as end_date
from demo_names d where d.n <= 10000;

insert into public.members (workspace_id, full_name, email, person_key, start_date, end_date, status)
select :'corp_ws', name, email, 'C-' || lpad(n::text, 5, '0'), start_date, end_date,
  case when end_date is null then 'active' else 'inactive' end::public.member_status
from corp_people;
create temporary table corp_ids as
select p.*, m.id as member_id, o.id as unit_id, u.parent as parent_unit_n
from corp_people p join public.members m on m.workspace_id = :'corp_ws' and m.email = p.email
join corp_units u on u.n = p.unit_n join public.org_units o on o.workspace_id = :'corp_ws' and o.code = u.code;
create index on corp_ids (n);

select set_config('app.defer_reporting_closure', 'on', false);
insert into public.member_assignments (workspace_id, member_id, valid_from, valid_to, org_unit_id, manager_member_id, position_id, career_level_id, employment_type_id)
select :'corp_ws', p.member_id, p.start_date, p.end_date + 1, p.unit_id,
  -- Heads report to the head of the unit above (division heads to you); others to their team lead.
  case when p.n <= 4 then :'corp_me'::uuid
       when p.n <= 100 then (select h.member_id from corp_ids h where h.n = p.parent_unit_n)
       else (select h.member_id from corp_ids h where h.n = p.unit_n) end,
  (select id from public.positions where workspace_id = :'corp_ws' and name = p.position),
  (select id from public.career_levels where workspace_id = :'corp_ws' and name = p.level),
  (select id from public.employment_types where workspace_id = :'corp_ws' and name = p.employment_type)
from corp_ids p;
update public.member_assignments set position_id = (select id from public.positions where workspace_id = :'corp_ws' and name = 'Chief Executive Officer')
where member_id = :'corp_me';
select set_config('app.defer_reporting_closure', 'off', false);
select app.rebuild_reporting_closure(:'corp_ws');

insert into public.member_compensation (workspace_id, member_id, valid_from, annual_salary, day_rate, currency)
select :'corp_ws', p.member_id, p.start_date,
  case when p.employment_type = 'Employee' then
    (case p.level when 'IC1' then 80000 when 'IC2' then 98000 when 'IC3' then 118000 when 'IC4' then 140000
       when 'IC5' then 165000 when 'M1' then 160000 when 'M2' then 190000 else 230000 end) + (p.n % 11) * 1200 end,
  case when p.employment_type = 'Contractor' then 500 + (p.n % 6) * 60 end,
  'USD'
from corp_ids p;

insert into public.custom_fields (workspace_id, key, label, type, sort_order) values
  (:'corp_ws', 'location', 'Location', 'single_choice', 10), (:'corp_ws', 'cost_type', 'Cost type', 'single_choice', 20);
insert into public.custom_field_options (workspace_id, field_id, label, sort_order)
select :'corp_ws', f.id, o.label, o.sort from public.custom_fields f
join (values ('location', 'New York', 10), ('location', 'Austin', 20), ('location', 'London', 30), ('location', 'Remote', 40),
  ('cost_type', 'Capex', 10), ('cost_type', 'Opex', 20)) o (key, label, sort) on o.key = f.key
where f.workspace_id = :'corp_ws';
insert into public.member_field_values (workspace_id, member_id, field_id, value)
select :'corp_ws', p.member_id, f.id,
  to_jsonb(case f.key when 'location' then (array['New York', 'Austin', 'London', 'Remote'])[1 + p.n % 4]
    else case when p.unit_n in (1, 3) or p.unit_n between 5 and 8 or p.unit_n between 13 and 16
      or (p.unit_n between 21 and 40) or (p.unit_n between 61 and 80) then 'Capex' else 'Opex' end end)
from corp_ids p join public.custom_fields f on f.workspace_id = :'corp_ws';
update public.planning_settings
set cost_split_field_id = (select id from public.custom_fields where workspace_id = :'corp_ws' and key = 'cost_type')
where workspace_id = :'corp_ws';

-- Time off: a third have leave ahead, a quarter had some, one in twenty is waiting for approval.
create temporary table corp_managers as
select a.member_id, a.manager_member_id as manager from public.member_assignments a
where a.workspace_id = :'corp_ws' and a.valid_to is null;
insert into demo_bookings (ws, member_id, type_name, start_date, end_date, status, approver)
select :'corp_ws'::uuid, p.member_id, 'Annual leave',
  pg_temp.monday(current_date + 7 + (p.n * 9) % 120), pg_temp.monday(current_date + 7 + (p.n * 9) % 120) + 2 + p.n % 3,
  'approved'::public.booking_status, m.manager
from corp_ids p join corp_managers m using (member_id) where p.end_date is null and p.n % 3 = 0
union all
select :'corp_ws'::uuid, p.member_id, 'Annual leave',
  pg_temp.monday(current_date - 30 - (p.n * 13) % 200), pg_temp.monday(current_date - 30 - (p.n * 13) % 200) + 4,
  'approved'::public.booking_status, m.manager
from corp_ids p join corp_managers m using (member_id)
where p.n % 4 = 1 and pg_temp.monday(current_date - 30 - (p.n * 13) % 200) > p.start_date
union all
select :'corp_ws'::uuid, p.member_id, 'Annual leave',
  pg_temp.monday(current_date + 30 + p.n % 40), pg_temp.monday(current_date + 30 + p.n % 40) + 1,
  'pending'::public.booking_status, m.manager
from corp_ids p join corp_managers m using (member_id) where p.end_date is null and (p.n % 20 = 7 or p.n <= 3)
union all
select :'corp_ws'::uuid, p.member_id, 'Sick leave', pg_temp.monday(current_date - 10 - (p.n * 7) % 90) + p.n % 5,
  pg_temp.monday(current_date - 10 - (p.n * 7) % 90) + p.n % 5, 'approved'::public.booking_status, null
from corp_ids p where p.n % 11 = 0;
select pg_temp.write_bookings();

-- Planning: rate cards by division and level, and a live 12-month plan with costs applied.
insert into public.rate_cards (workspace_id, name, priority, is_default) values
  (:'corp_ws', 'Contractors', 10, false), (:'corp_ws', 'Senior engineering', 20, false),
  (:'corp_ws', 'Engineering', 30, false), (:'corp_ws', 'Commercial', 40, false), (:'corp_ws', 'Everyone else', 99, true);
insert into public.rate_card_conditions (workspace_id, card_id, field, operator, value, sort_order)
select :'corp_ws', r.id, c.field, c.op::public.rate_operator, c.value, c.sort
from public.rate_cards r
join (values ('Contractors', 'employment_type', 'equals', 'Contractor', 10),
  ('Senior engineering', 'unit_code', 'starts_with', 'C1', 10),
  ('Senior engineering', 'career_level', 'in', 'IC4, IC5, M1, M2, M3', 20),
  ('Engineering', 'unit_code', 'starts_with', 'C1', 10),
  ('Commercial', 'unit_code', 'starts_with', 'C2', 10)) c (card, field, op, value, sort) on c.card = r.name
where r.workspace_id = :'corp_ws';
insert into public.rate_card_rates (workspace_id, card_id, valid_from, day_rate, working_days, currency)
select :'corp_ws', r.id, date_trunc('month', current_date)::date, v.rate, 21, 'USD'
from public.rate_cards r
join (values ('Contractors', 700), ('Senior engineering', 620), ('Engineering', 500), ('Commercial', 460)) v (card, rate) on v.card = r.name
where r.workspace_id = :'corp_ws';

analyze public.members, public.member_assignments, public.member_compensation, public.member_field_values;
set role authenticated;
select public.create_scenario(:'corp_ws', '12-month plan', date_trunc('month', current_date)::date,
  (date_trunc('month', current_date) + interval '11 months')::date) as corp_plan \gset
reset role;
insert into public.planned_roles (workspace_id, scenario_id, title, org_unit_id, position_id, career_level_id, employment_type_id, start_date)
select :'corp_ws', :'corp_plan', 'Senior Engineer', o.id,
  (select id from public.positions where workspace_id = :'corp_ws' and name = 'Senior Engineer'),
  (select id from public.career_levels where workspace_id = :'corp_ws' and name = 'IC4'),
  (select id from public.employment_types where workspace_id = :'corp_ws' and name = 'Employee'),
  date_trunc('month', current_date + 31 * (1 + u.n % 6))::date
from corp_units u join public.org_units o on o.workspace_id = :'corp_ws' and o.code = u.code
where u.level = 'Team' and u.code like 'C1-%' and u.n % 2 = 0;
set role authenticated;
select public.apply_rate_cards(:'corp_plan');
select public.set_scenario_status(:'corp_plan', 'submitted');
select public.set_scenario_status(:'corp_plan', 'approved');
select public.set_live_scenario(:'corp_plan');
reset role;

select set_config('request.jwt.claims', '', false);

-- What was made.
select w.name, w.template_key,
  (select count(*) from public.members m where m.workspace_id = w.id) as people,
  (select count(*) from public.org_units u where u.workspace_id = w.id) as units,
  (select count(*) from public.bookings b where b.workspace_id = w.id) as bookings,
  (select count(*) from public.holidays h where h.workspace_id = w.id) as holidays,
  (select count(*) from public.scenarios s where s.workspace_id = w.id) as plans
from public.workspaces w where w.slug in ('personal-mike', 'team-plp', 'company-kieu', 'company-corp') order by w.created_at;
