import { supabase } from '@/lib/supabase'
import { AnalysisCharts } from '@/components/charts/AnalysisCharts'
import type { StageAnalysis, ProjectSummary, StageStatusRow } from '@/types'

export const revalidate = 60

async function getData() {
  const [stageAnalysis, summaries, allStages] = await Promise.all([
    supabase.from('stage_analysis_view').select('*').order('sort_order'),
    supabase.from('project_summary_view').select('*'),
    supabase.from('stage_status_view').select('*'),
  ])
  return {
    stageAnalysis: (stageAnalysis.data ?? []) as StageAnalysis[],
    summaries: (summaries.data ?? []) as ProjectSummary[],
    allStages: (allStages.data ?? []) as StageStatusRow[],
  }
}

export default async function AnalysisPage() {
  const { stageAnalysis, summaries, allStages } = await getData()

  // Bottleneck: stages with highest avg delay
  const bottlenecks = stageAnalysis
    .filter(s => s.avg_delay_days !== null && s.avg_delay_days! > 0)
    .sort((a, b) => (b.avg_delay_days ?? 0) - (a.avg_delay_days ?? 0))

  // At-risk: active projects with most delayed stages
  const atRisk = summaries
    .filter(p => p.status === 'active' && p.stages_delayed > 0)
    .sort((a, b) => b.stages_delayed - a.stages_delayed)

  // Best performers
  const bestProjects = summaries
    .filter(p => p.total_stages_done >= 3 && p.on_time_pct !== null)
    .sort((a, b) => (b.on_time_pct ?? 0) - (a.on_time_pct ?? 0))
    .slice(0, 5)

  // Worst performers
  const worstProjects = summaries
    .filter(p => p.total_stages_done >= 3 && p.on_time_pct !== null)
    .sort((a, b) => (a.on_time_pct ?? 100) - (b.on_time_pct ?? 100))
    .slice(0, 5)

  // Location analysis — avg max delay days per project (more useful than binary has-delay)
  const locationMap: Record<string, { total: number; totalDelay: number; projects: string[] }> = {}
  summaries.forEach(p => {
    const loc = (p.location && p.location.trim()) ? p.location.trim() : 'Unknown'
    if (!locationMap[loc]) locationMap[loc] = { total: 0, totalDelay: 0, projects: [] }
    locationMap[loc].total++
    locationMap[loc].totalDelay += p.max_delay_days ?? 0
    locationMap[loc].projects.push(p.client_name)
  })
  const locationData = Object.entries(locationMap)
    .map(([loc, d]) => ({
      loc,
      total: d.total,
      avgDelay: Math.round(d.totalDelay / d.total),
      projects: d.projects,
    }))
    .filter(d => d.total >= 1)
    .sort((a, b) => b.avgDelay - a.avgDelay)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Deep Analysis</h1>
        <p className="text-sm text-gray-500 mt-0.5">Business insights across all projects</p>
      </div>

      {/* Summary insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Biggest bottleneck stage</p>
          <p className="text-base font-semibold text-red-700">
            {bottlenecks[0]?.stage_name ?? '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Avg +{Math.round(bottlenecks[0]?.avg_delay_days ?? 0)}d delay · {bottlenecks[0]?.count_delayed ?? 0} projects affected
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">At-risk active projects</p>
          <p className="text-2xl font-semibold text-amber-700">{atRisk.length}</p>
          <p className="text-xs text-gray-400 mt-1">Active projects with ≥1 delayed stage</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Most problematic location</p>
          <p className="text-base font-semibold text-red-700">
            {locationData[0]?.loc ?? '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Avg +{locationData[0]?.avgDelay ?? 0}d delay · {locationData[0]?.total ?? 0} projects
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
