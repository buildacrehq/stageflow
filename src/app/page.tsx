import { supabase } from '@/lib/supabase'
import { KpiCard } from '@/components/ui/KpiCard'
import { OverviewCharts } from '@/components/charts/OverviewCharts'
import type { ProjectSummary, StageAnalysis } from '@/types'

export const revalidate = 60

async function getData() {
  const [summaries, stageAnalysis] = await Promise.all([
    supabase.from('project_summary_view').select('*'),
    supabase.from('stage_analysis_view').select('*').order('sort_order'),
  ])
  return {
    summaries: (summaries.data ?? []) as ProjectSummary[],
    stageAnalysis: (stageAnalysis.data ?? []) as StageAnalysis[],
  }
}

export default async function OverviewPage() {
  const { summaries, stageAnalysis } = await getData()

  const totalProjects = summaries.length
  const active = summaries.filter(p => p.status === 'active').length
  const completed = summaries.filter(p => p.status === 'completed').length

  let totalMilestones = 0, onTime = 0, inBuffer = 0, delayed = 0
  summaries.forEach(p => {
    totalMilestones += p.stages_on_time + p.stages_in_buffer + p.stages_delayed
    onTime   += p.stages_on_time
    inBuffer += p.stages_in_buffer
    delayed  += p.stages_delayed
  })

  const pct = (n: number) =>
    totalMilestones > 0 ? `${Math.round((n / totalMilestones) * 100)}%` : '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {totalProjects} projects · {totalMilestones} milestones tracked
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total Projects"
          value={totalProjects}
          sub={`${active} active · ${completed} handed over`}
        />
        <KpiCard
          label="On Time"
          value={pct(onTime)}
          sub={`${onTime} milestones`}
          color="text-green-700"
        />
        <KpiCard
          label="Within Buffer"
          value={pct(inBuffer)}
          sub="≤7 day overrun"
          color="text-amber-700"
        />
        <KpiCard
          label="Delayed"
          value={pct(delayed)}
          sub={`${delayed} overdue`}
          color="text-red-700"
        />
      </div>

      <OverviewCharts stageAnalysis={stageAnalysis} summaries={summaries} />
    </div>
  )
}
