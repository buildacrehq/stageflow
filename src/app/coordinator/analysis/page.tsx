import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserRole } from '@/lib/supabase-server'
import { AnalysisCharts } from '@/components/charts/AnalysisCharts'
import type { ProjectSummary, StageStatusRow, StageAnalysis, StageCategory } from '@/types'

export const revalidate = 0

export default async function CoordinatorAnalysisPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const role = await getUserRole()
  if (role !== 'coordinator') redirect('/')

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: assignments } = await sb
    .from('coordinator_projects').select('project_id').eq('user_id', user.id).is('removed_at', null)
  const projectIds = (assignments ?? []).map(a => a.project_id)

  if (projectIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-gray-500 font-medium">No projects assigned yet</p>
        <p className="text-xs text-gray-400 mt-1">Contact your admin to get projects assigned.</p>
      </div>
    )
  }

  const [summariesRes, allStagesRes, targetsRes] = await Promise.all([
    sb.from('project_summary_view').select('*').in('id', projectIds),
    sb.from('stage_status_view').select('*').in('project_id', projectIds),
    sb.from('stage_targets').select('*').order('sort_order'),
  ])

  const summaries = (summariesRes.data ?? []) as ProjectSummary[]
  const allStages = (allStagesRes.data ?? []) as StageStatusRow[]
  const targets = targetsRes.data ?? []

  // Build StageAnalysis from raw stage data (filtered to this coordinator's projects)
  const stageAnalysis: StageAnalysis[] = targets.map(t => {
    const rows = allStages.filter(s => s.stage_name === t.stage_name && s.completed_date)
    const onTime = rows.filter(s => s.stage_status === 'on_time').length
    const buffer = rows.filter(s => s.stage_status === 'buffer').length
    const delayed = rows.filter(s => s.stage_status === 'delayed').length
    const total = rows.length
    const daysArr = rows.map(s => s.days_from_mob).filter((d): d is number => d !== null)
    const delayArr = rows.filter(s => (s.delay_days ?? 0) > 0).map(s => s.delay_days!)
    return {
      stage_name: t.stage_name,
      target_days: t.target_days,
      buffer_days: t.buffer_days,
      category: t.category as StageCategory,
      sort_order: t.sort_order,
      project_count: total,
      avg_days_from_mob: daysArr.length > 0 ? daysArr.reduce((a, b) => a + b, 0) / daysArr.length : null,
      avg_delay_days: delayArr.length > 0 ? delayArr.reduce((a, b) => a + b, 0) / delayArr.length : null,
      max_days_from_mob: daysArr.length > 0 ? Math.max(...daysArr) : null,
      min_days_from_mob: daysArr.length > 0 ? Math.min(...daysArr) : null,
      count_on_time: onTime,
      count_buffer: buffer,
      count_delayed: delayed,
      on_time_pct: total > 0 ? Math.round((onTime / total) * 100) : null,
    }
  })

  const bottlenecks = stageAnalysis
    .filter(s => (s.avg_delay_days ?? 0) > 0)
    .sort((a, b) => (b.avg_delay_days ?? 0) - (a.avg_delay_days ?? 0))

  const atRisk = summaries
    .filter(p => p.status === 'active' && p.stages_delayed > 0)
    .sort((a, b) => b.stages_delayed - a.stages_delayed)

  const bestProjects = summaries
    .filter(p => p.total_stages_done >= 3 && p.on_time_pct !== null)
    .sort((a, b) => (b.on_time_pct ?? 0) - (a.on_time_pct ?? 0))
    .slice(0, 5)

  const worstProjects = summaries
    .filter(p => p.total_stages_done >= 3 && p.on_time_pct !== null)
    .sort((a, b) => (a.on_time_pct ?? 100) - (b.on_time_pct ?? 100))
    .slice(0, 5)

  const locationMap: Record<string, { total: number; totalDelay: number; projects: string[] }> = {}
  summaries.forEach(p => {
    const loc = p.location?.trim() || 'Unknown'
    if (!locationMap[loc]) locationMap[loc] = { total: 0, totalDelay: 0, projects: [] }
    locationMap[loc].total++
    locationMap[loc].totalDelay += p.max_delay_days ?? 0
    locationMap[loc].projects.push(p.client_name)
  })
  const locationData = Object.entries(locationMap)
    .map(([loc, d]) => ({ loc, total: d.total, avgDelay: Math.round(d.totalDelay / d.total), projects: d.projects }))
    .sort((a, b) => b.avgDelay - a.avgDelay)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Analysis</h1>
        <p className="text-sm text-gray-500 mt-0.5">Stage performance across your {summaries.length} assigned project{summaries.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Biggest bottleneck stage</p>
          <p className="text-base font-semibold text-red-700">{bottlenecks[0]?.stage_name ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">
            Avg +{Math.round(bottlenecks[0]?.avg_delay_days ?? 0)}d delay · {bottlenecks[0]?.count_delayed ?? 0} project{(bottlenecks[0]?.count_delayed ?? 0) !== 1 ? 's' : ''} affected
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">At-risk active projects</p>
          <p className="text-2xl font-semibold text-amber-700">{atRisk.length}</p>
          <p className="text-xs text-gray-400 mt-1">Active projects with ≥1 delayed stage</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Most problematic location</p>
          <p className="text-base font-semibold text-red-700">{locationData[0]?.loc ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">
            Avg +{locationData[0]?.avgDelay ?? 0}d delay · {locationData[0]?.total ?? 0} project{(locationData[0]?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <AnalysisCharts
        stageAnalysis={stageAnalysis}
        summaries={summaries}
        allStages={allStages}
        bottlenecks={bottlenecks}
        atRisk={atRisk}
        bestProjects={bestProjects}
        worstProjects={worstProjects}
        locationData={locationData}
      />
    </div>
  )
}
