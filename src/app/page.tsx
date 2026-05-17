import { supabase } from '@/lib/supabase'
import { KpiCard } from '@/components/ui/KpiCard'
import { OverviewCharts } from '@/components/charts/OverviewCharts'
import { DeadlinesPanel } from '@/components/ui/DeadlinesPanel'
import type { ProjectSummary, StageAnalysis } from '@/types'

export const revalidate = 60

async function getData() {
  const [summaries, stageAnalysis, completedStages, targets] = await Promise.all([
    supabase.from('project_summary_view').select('*'),
    supabase.from('stage_analysis_view').select('*').order('sort_order'),
    supabase.from('project_stages').select('project_id, stage_name').not('completed_date', 'is', null),
    supabase.from('stage_targets').select('stage_name, target_days, sort_order').order('sort_order'),
  ])
  return {
    summaries: (summaries.data ?? []) as ProjectSummary[],
    stageAnalysis: (stageAnalysis.data ?? []) as StageAnalysis[],
    completedStages: completedStages.data ?? [],
    targets: targets.data ?? [],
  }
}

export default async function OverviewPage() {
  const { summaries, stageAnalysis, completedStages, targets } = await getData()

  const totalProjects = summaries.length
  const active = summaries.filter(p => p.status === 'active').length
  const completed = summaries.filter(p => p.status === 'completed').length
  const onHold = summaries.filter(p => p.status === 'on_hold').length

  const activeProjects = summaries.filter(p => p.status === 'active')
  let totalMilestones = 0, onTime = 0, inBuffer = 0, delayed = 0
  activeProjects.forEach(p => {
    totalMilestones += p.stages_on_time + p.stages_in_buffer + p.stages_delayed
    onTime   += p.stages_on_time
    inBuffer += p.stages_in_buffer
    delayed  += p.stages_delayed
  })

  const pct = (n: number) =>
    totalMilestones > 0 ? `${Math.round((n / totalMilestones) * 100)}%` : '—'

  // Average delay across active projects (only those with any delay)
  const delayedProjects = activeProjects.filter(p => p.max_delay_days != null && p.max_delay_days > 0)
  const avgDelay = delayedProjects.length > 0
    ? Math.round(delayedProjects.reduce((sum, p) => sum + (p.max_delay_days ?? 0), 0) / delayedProjects.length)
    : 0

  // Build completed stage map
  const completedMap = new Map<string, Set<string>>()
  completedStages.forEach(({ project_id, stage_name }) => {
    if (!completedMap.has(project_id)) completedMap.set(project_id, new Set())
    completedMap.get(project_id)!.add(stage_name)
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in30 = new Date(today.getTime() + 30 * 86400000)

  const overdue: {
    projectId: string; client: string; stage: string
    deadline: string; daysLeft: number; overdue: boolean
  }[] = []
  const upcoming: typeof overdue = []

  summaries
    .filter(p => p.status === 'active' && p.mob_date)
    .forEach(p => {
      const mob = new Date(p.mob_date!)
      const done = completedMap.get(p.id) ?? new Set()
      for (const t of targets) {
        if (done.has(t.stage_name)) continue
        const dl = new Date(mob.getTime() + t.target_days * 86400000)
        const daysLeft = Math.round((dl.getTime() - today.getTime()) / 86400000)
        const entry = {
          projectId: p.id,
          client: p.client_name,
          stage: t.stage_name,
          deadline: dl.toISOString(),
          daysLeft,
          overdue: daysLeft < 0,
        }
        if (daysLeft < 0) {
          overdue.push(entry)
        } else if (dl <= in30) {
          upcoming.push(entry)
        }
      }
    })

  // Overdue: most recently overdue first (least negative = most actionable)
  overdue.sort((a, b) => b.daysLeft - a.daysLeft)
  // Upcoming: soonest first
  upcoming.sort((a, b) => a.daysLeft - b.daysLeft)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {totalProjects} projects total · milestone stats show active projects only
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Projects" value={totalProjects} sub={`${active} active · ${completed} done · ${onHold} on hold`} />
        <KpiCard label="On Time" value={pct(onTime)} sub={`${onTime} milestones · active only`} color="text-green-700" />
        <KpiCard label="Delayed" value={pct(delayed)} sub={`${delayed} overdue stages · active only`} color="text-red-700" />
        <KpiCard
          label="Avg Delay"
          value={avgDelay > 0 ? `+${avgDelay}d` : '—'}
          sub={avgDelay > 0 ? `avg max delay across ${delayedProjects.length} delayed projects` : 'no delays recorded'}
          color={avgDelay > 30 ? 'text-red-700' : avgDelay > 15 ? 'text-amber-700' : 'text-gray-700'}
        />
      </div>

      <DeadlinesPanel overdue={overdue} upcoming={upcoming} />

      <OverviewCharts stageAnalysis={stageAnalysis} summaries={summaries} />
    </div>
  )
}
