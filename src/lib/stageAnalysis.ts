import type { StageAnalysis, StageStatusRow } from '@/types'

// stage_analysis_view aggregates across ALL projects at the DB level, so it can't
// respect the Tracked/Reference/All filter tabs. Recomputing it here from
// already-filtered stage rows keeps every chart consistent with the active tab.
export function computeStageAnalysis(rows: StageStatusRow[]): StageAnalysis[] {
  const byStage = new Map<string, StageStatusRow[]>()
  rows.forEach(r => {
    if (!byStage.has(r.stage_name)) byStage.set(r.stage_name, [])
    byStage.get(r.stage_name)!.push(r)
  })
  const avg = (nums: number[]) => nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null
  return Array.from(byStage.values()).map(rs => {
    const first = rs[0]
    const daysFromMob = rs.map(r => r.days_from_mob).filter((n): n is number => n !== null)
    const delays = rs.map(r => r.delay_days).filter((n): n is number => n !== null)
    const count_on_time = rs.filter(r => r.stage_status === 'on_time').length
    const count_buffer = rs.filter(r => r.stage_status === 'buffer').length
    const count_delayed = rs.filter(r => r.stage_status === 'delayed').length
    return {
      stage_name: first.stage_name,
      target_days: first.target_days,
      buffer_days: first.buffer_days,
      category: first.category,
      sort_order: first.sort_order,
      project_count: rs.length,
      avg_days_from_mob: avg(daysFromMob),
      avg_delay_days: avg(delays),
      max_days_from_mob: daysFromMob.length ? Math.max(...daysFromMob) : null,
      min_days_from_mob: daysFromMob.length ? Math.min(...daysFromMob) : null,
      count_on_time,
      count_buffer,
      count_delayed,
      on_time_pct: rs.length ? Math.round(((count_on_time + count_buffer) / rs.length) * 1000) / 10 : null,
    }
  }).sort((a, b) => a.sort_order - b.sort_order)
}
