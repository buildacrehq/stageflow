-- Per-project stage target overrides
-- Allows each project to have custom target/buffer days per stage
-- Falls back to global stage_targets defaults when no override exists

create table if not exists project_stage_overrides (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  stage_name   text not null references stage_targets(stage_name) on update cascade,
  target_days  integer not null,
  buffer_days  integer not null default 7,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (project_id, stage_name)
);

create trigger trg_overrides_updated_at before update on project_stage_overrides
  for each row execute function update_updated_at();

-- Update stage_status_view to use project override when available
create or replace view stage_status_view as
select
  p.id                                                       as project_id,
  p.client_name,
  p.location,
  p.mob_date,
  p.status                                                   as project_status,
  ps.stage_name,
  ps.completed_date,
  coalesce(pso.target_days, st.target_days)                  as target_days,
  coalesce(pso.buffer_days, st.buffer_days)                  as buffer_days,
  st.category,
  st.sort_order,
  case
    when p.mob_date is not null and ps.completed_date is not null
    then (ps.completed_date - p.mob_date)::integer
    else null
  end                                                        as days_from_mob,
  case
    when p.mob_date is null or ps.completed_date is null then 'no_data'
    when (ps.completed_date - p.mob_date)::integer
         <= coalesce(pso.target_days, st.target_days) then 'on_time'
    when (ps.completed_date - p.mob_date)::integer
         <= coalesce(pso.target_days, st.target_days)
          + coalesce(pso.buffer_days, st.buffer_days) then 'buffer'
    else 'delayed'
  end                                                        as stage_status,
  case
    when p.mob_date is not null and ps.completed_date is not null
    then greatest(0,
      (ps.completed_date - p.mob_date)::integer
      - coalesce(pso.target_days, st.target_days))
    else null
  end                                                        as delay_days,
  (pso.id is not null)                                       as is_overridden
from project_stages ps
join projects p on p.id = ps.project_id
join stage_targets st on st.stage_name = ps.stage_name
left join project_stage_overrides pso
  on pso.project_id = p.id and pso.stage_name = ps.stage_name;
