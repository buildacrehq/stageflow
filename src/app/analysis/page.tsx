import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AnalysisCharts } from '@/components/charts/AnalysisCharts'
import { computeStageAnalysis } from '@/lib/stageAnalysis'
import type { ProjectSummary, StageStatusRow } from '@/types'

export const revalidate = 60

async function getData() {
  const [summaries, allStages] = await Promise.all([
    supabase.from('project_summary_view').select('*'),
    supabase.from('stage_status_view').select('*'),
  ])
  return {
    summaries: (summaries.data ?? []) as ProjectSummary[],
    allStages: (allStages.data ?? []) as StageStatusRow[],
  }
}

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { summaries: allSummaries, allStages: allStagesRaw } = await getData()

  const { category = 'all' } = await searchParams
  const activeCategory = category === 'tracked' || category === 'reference' ? category : 'all'
  const summaries = activeCategory === 'all' ? allSummaries : allSummaries.filter(p => p.data_category === activeCategory)
  const includedIds = new Set(summaries.map(p => p.id))
  const allStages = activeCategory === 'all' ? allStagesRaw : allStagesRaw.filter(s => includedIds.has(s.project_id))
  const stageAnalysis = computeStageAnalysis(allStages)

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

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeCategory === t
        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
        : 'text-gray-500 hover:text-gray-700'
    }`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Deep Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Business insights across all projects</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <Link href="/analysis?category=tracked" className={tabCls('tracked')}>Tracked</Link>
          <Link href="/analysis?category=reference" className={tabCls('reference')}>Reference</Link>
          <Link href="/analysis?category=all" className={tabCls('all')}>All</Link>
        </div>
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
