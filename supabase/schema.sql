-- ============================================================
-- STAGEFLOW SCHEMA — Buildacre Construction Tracker
-- Run this in Supabase SQL Editor
-- ============================================================

-- --------------------------------------------------------
-- 1. STAGE TARGETS (editable per stage)
-- --------------------------------------------------------
create table if not exists stage_targets (
  id            uuid primary key default gen_random_uuid(),
  stage_name    text unique not null,
  target_days   integer not null,
  buffer_days   integer not null default 7,
  category      text not null check (category in ('structure', 'finishing')),
  sort_order    integer not null,
  updated_at    timestamptz default now()
);

-- --------------------------------------------------------
-- 2. PROJECTS
-- --------------------------------------------------------
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  client_name   text not null,
  location      text,
  mob_date      date,
  status        text not null default 'active' check (status in ('active', 'completed', 'on_hold')),
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Columns added after initial table creation, applied directly on the live
-- database over time. Listed here (idempotent — safe to re-run) so this file
-- stays an accurate record of the real schema.
alter table projects add column if not exists floors text;
alter table projects add column if not exists plot_size text;
alter table projects add column if not exists client_phone text;
alter table projects add column if not exists engineer_name text;
alter table projects add column if not exists engineer_phone text;
alter table projects add column if not exists project_manager_name text;
alter table projects add column if not exists project_manager_phone text;
alter table projects add column if not exists maps_link text;
alter table projects add column if not exists drive_link text;
alter table projects add column if not exists slab_area integer;
alter table projects add column if not exists data_category text not null default 'tracked'
  check (data_category in ('tracked', 'reference'));

-- --------------------------------------------------------
-- 3. PROJECT STAGES (one row per stage per project)
-- --------------------------------------------------------
create table if not exists project_stages (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  stage_name      text not null references stage_targets(stage_name) on update cascade,
  completed_date  date,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (project_id, stage_name)
);

-- Added after initial creation, applied directly on the live database.
alter table project_stages add column if not exists payment_date date;

-- --------------------------------------------------------
-- 4. ANALYTICS VIEW — flat row per stage per project
--    with computed days_from_mob, status, delay_days
-- --------------------------------------------------------
create or replace view stage_status_view as
select
  p.id                                                    as project_id,
  p.client_name,
  p.location,
  p.mob_date,
  p.status                                                as project_status,
  ps.stage_name,
  ps.completed_date,
  st.target_days,
  st.buffer_days,
  st.category,
  st.sort_order,
  case
    when p.mob_date is not null and ps.completed_date is not null
    then (ps.completed_date - p.mob_date)::integer
    else null
  end                                                     as days_from_mob,
  case
    when p.mob_date is null or ps.completed_date is null then 'no_data'
    when (ps.completed_date - p.mob_date)::integer <= st.target_days then 'on_time'
    when (ps.completed_date - p.mob_date)::integer <= st.target_days + st.buffer_days then 'buffer'
    else 'delayed'
  end                                                     as stage_status,
  case
    when p.mob_date is not null and ps.completed_date is not null
    then greatest(0, (ps.completed_date - p.mob_date)::integer - st.target_days)
    else null
  end                                                     as delay_days
from project_stages ps
join projects p on p.id = ps.project_id
join stage_targets st on st.stage_name = ps.stage_name;

-- --------------------------------------------------------
-- 5. SUMMARY VIEW — one row per project with aggregate stats
-- --------------------------------------------------------
create or replace view project_summary_view as
select
  p.id,
  p.client_name,
  p.location,
  p.mob_date,
  p.status,
  count(ps.id)                                            as total_stages_done,
  count(case when ssv.stage_status = 'on_time' then 1 end) as stages_on_time,
  count(case when ssv.stage_status = 'buffer' then 1 end)  as stages_in_buffer,
  count(case when ssv.stage_status = 'delayed' then 1 end) as stages_delayed,
  round(
    count(case when ssv.stage_status in ('on_time','buffer') then 1 end)::numeric
    / nullif(count(case when ssv.stage_status != 'no_data' then 1 end), 0) * 100, 1
  )                                                        as on_time_pct,
  max(case when ssv.stage_status = 'delayed' then ssv.delay_days else 0 end) as max_delay_days,
  max(ps.completed_date)                                   as last_stage_date,
  p.created_at
from projects p
left join project_stages ps on ps.project_id = p.id
left join stage_status_view ssv on ssv.project_id = p.id and ssv.stage_name = ps.stage_name
group by p.id, p.client_name, p.location, p.mob_date, p.status, p.created_at;

-- --------------------------------------------------------
-- 6. STAGE ANALYSIS VIEW — per stage across all projects
-- --------------------------------------------------------
create or replace view stage_analysis_view as
select
  st.stage_name,
  st.target_days,
  st.buffer_days,
  st.category,
  st.sort_order,
  count(ssv.project_id)                                    as project_count,
  round(avg(ssv.days_from_mob), 1)                         as avg_days_from_mob,
  round(avg(ssv.delay_days), 1)                            as avg_delay_days,
  max(ssv.days_from_mob)                                   as max_days_from_mob,
  min(ssv.days_from_mob)                                   as min_days_from_mob,
  count(case when ssv.stage_status = 'on_time' then 1 end) as count_on_time,
  count(case when ssv.stage_status = 'buffer' then 1 end)  as count_buffer,
  count(case when ssv.stage_status = 'delayed' then 1 end) as count_delayed,
  round(
    count(case when ssv.stage_status in ('on_time','buffer') then 1 end)::numeric
    / nullif(count(ssv.project_id), 0) * 100, 1
  )                                                        as on_time_pct
from stage_targets st
left join stage_status_view ssv on ssv.stage_name = st.stage_name
group by st.stage_name, st.target_days, st.buffer_days, st.category, st.sort_order
order by st.sort_order;

-- --------------------------------------------------------
-- 7. CLIENT PROJECT ASSIGNMENTS (one project per viewer)
-- --------------------------------------------------------
create table if not exists client_projects (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  created_at timestamptz default now()
);

-- --------------------------------------------------------
-- 8. AUTO-UPDATE updated_at trigger
-- --------------------------------------------------------
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_projects_updated_at before update on projects
  for each row execute function update_updated_at();
create trigger trg_stages_updated_at before update on project_stages
  for each row execute function update_updated_at();
create trigger trg_targets_updated_at before update on stage_targets
  for each row execute function update_updated_at();
