import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { KpiCard } from '@/components/ui/KpiCard'
import { OverviewCharts } from '@/components/charts/OverviewCharts'
import { DeadlinesPanel } from '@/components/ui/DeadlinesPanel'
import { ProjectProgressPanel } from '@/components/ui/ProjectProgressPanel'
import { visibleStructureStages, FINISHING_STAGES } from '@/lib/constants'
import type { ProjectSummary, StageAnalysis, StageStatusRow } from '@/types'
import { computeStageAnalysis } from '@/lib/stageAnalysis'
import { parseCategoryParam, categoryTabCls } from '@/lib/dataCategory'

export const revalidate = 0

async function getData() {
  const [summaries, allStages, completedStages, targets, projectFloors] = await Promise.all([
    supabase.from('project_summary_view').select('*'),
    supabase.from('stage_status_view').select('*'),
    supabase.from('project_stages').select('project_id, stage_name').not('completed_date', 'is', null),
    supabase.from('stage_targets').select('stage_name, target_days, sort_order').order('sort_order'),
    supabase.from('projects').select('id, floors'),
  ])
  return {
    summaries: (summaries.data ?? []) as ProjectSummary[],
    allStages: (allStages.data ?? []) as StageStatusRow[],
    completedStages: completedStages.data ?? [],
    targets: targets.data ?? [],
    floorsMap: Object.fromEntries((projectFloors.data ?? []).map(p => [p.id, p.floors as string | null])),
  }
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { summaries: allSummaries, allStages: allStagesRaw, completedStages, targets, floorsMap } = await getData()

  const { category } = await searchParams
  const activeCategory = parseCategoryParam(category)
  const summaries = activeCategory === 'all' ? allSummaries : allSummaries.filter(p => p.data_category === activeCategory)
  const includedIds = new Set(summaries.map(p => p.id))
  const allStages = activeCategory === 'all' ? allStagesRaw : allStagesRaw.filter(s => includedIds.has(s.project_id))
  const stageAnalysis: StageAnalysis[] = computeStageAnalysis(allStages)

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

  const delayedProjects = activeProjects.filter(p => p.max_delay_days != null && p.max_delay_days > 0)
  const avgDelay = delayedProjects.length > 0
    ? Math.round(delayedProjects.reduce((sum, p) => sum + (p.max_delay_days ?? 0), 0) / delayedProjects.length)
    : 0

  // Project completion % — based on floors-aware total stages
  const projectProgress = activeProjects
    .map(p => {
      const floors = floorsMap[p.id] ?? null
      const totalStages = visibleStructureStages(floors).length + FINISHING_STAGES.length
      const pct = Math.min(100, Math.round((p.total_stages_done / totalStages) * 100))
      return {
        id: p.id,
        client: p.client_name,
        stagesDone: p.total_stages_done,
        totalStages,
        pct,
        onTimePct: p.on_time_pct,
        stagesDelayed: p.stages_delayed,
      }
    })
    .sort((a, b) => b.pct - a.pct)

  // Build completed stage map for deadlines
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
        if (daysLeft < 0) overdue.push(entry)
        else if (dl <= in30) upcoming.push(entry)
      }
    })

  overdue.sort((a, b) => b.daysLeft - a.daysLeft)
  upcoming.sort((a, b) => a.daysLeft - b.daysLeft)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalProjects} projects total · milestone stats show active projects only
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <Link href="/?category=tracked" className={categoryTabCls(activeCategory, 'tracked')}>Tracked</Link>
          <Link href="/?category=reference" className={categoryTabCls(activeCategory, 'reference')}>Reference</Link>
          <Link href="/?category=all" className={categoryTabCls(activeCategory, 'all')}>All</Link>
        </div>
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

      <ProjectProgressPanel projects={projectProgress} />

      <DeadlinesPanel overdue={overdue} upcoming={upcoming} />

      <OverviewCharts stageAnalysis={stageAnalysis} summaries={summaries} />
    </div>
  )
}
