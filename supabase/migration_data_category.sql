-- Manual per-project data quality category: 'tracked' (complete data, used for full
-- analysis) vs 'reference' (incomplete data, kept visible everywhere but excluded
-- from Overview/Analytics aggregate stats unless "All" is selected).
alter table projects
  add column if not exists data_category text not null default 'tracked'
  check (data_category in ('tracked', 'reference'));

drop view if exists project_summary_view;

create view project_summary_view as
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
  p.created_at,
  p.data_category
from projects p
left join project_stages ps on ps.project_id = p.id
left join stage_status_view ssv on ssv.project_id = p.id and ssv.stage_name = ps.stage_name
group by p.id, p.client_name, p.location, p.mob_date, p.status, p.created_at, p.data_category;
