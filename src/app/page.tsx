import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { KpiCard } from '@/components/ui/KpiCard'
import { OverviewCharts } from '@/components/charts/OverviewCharts'
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

  // KPIs only count active projects — completed projects skew the numbers
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

  // Upcoming deadlines: active projects, stages not yet done, due in next 30 days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in30 = new Date(today.getTime() + 30 * 86400000)

  const completedMap = new Map<string, Set<string>>()
  completedStages.forEach(({ project_id, stage_name }) => {
    if (!completedMap.has(project_id)) completedMap.set(project_id, new Set())
    completedMap.get(project_id)!.add(stage_name)
  })

  type Deadline = {
    projectId: string
    client: string
    stage: string
    deadline: Date
    daysLeft: number
    overdue: boolean
  }

  const deadlines: Deadline[] = []
  summaries
    .filter(p => p.status === 'active' && p.mob_date)
    .forEach(p => {
      const mob = new Date(p.mob_date!)
      const done = completedMap.get(p.id) ?? new Set()
      for (const t of targets) {
        if (done.has(t.stage_name)) continue
        const dl = new Date(mob.getTime() + t.target_days * 86400000)
        if (dl <= in30) {
          const daysLeft = Math.round((dl.getTime() - today.getTime()) / 86400000)
          deadlines.push({
            projectId: p.id,
            client: p.client_name,
            stage: t.stage_name,
            deadline: dl,
            daysLeft,
            overdue: daysLeft < 0,
          })
        }
      }
    })

  deadlines.sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
  const upcomingToShow = deadlines.slice(0, 12)

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
        <KpiCard label="Within Buffer" value={pct(inBuffer)} sub={`${inBuffer} milestones · active only`} color="text-amber-700" />
        <KpiCard label="Delayed" value={pct(delayed)} sub={`${delayed} overdue · active only`} color="text-red-700" />
      </div>

      {/* Upcoming deadlines */}
      {upcomingToShow.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Upcoming stage deadlines</p>
              <p className="text-xs text-gray-400 mt-0.5">Active projects · next 30 days</p>
            </div>
            {deadlines.filter(d => d.overdue).length > 0 && (
              <span className="text-xs px-2.5 py-1 bg-red-50 text-red-600 font-medium rounded-full">
                {deadlines.filter(d => d.overdue).length} overdue
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingToShow.map((d, i) => {
              const urgency = d.overdue ? 'text-red-600' : d.daysLeft <= 7 ? 'text-amber-600' : 'text-gray-500'
              const bg = d.overdue ? 'bg-red-50' : ''
              return (
                <Link
                  key={i}
                  href={`/projects/${d.projectId}`}
                  className={`flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors ${bg}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{d.client}</p>
                      <p className="text-xs text-gray-400 truncate">{d.stage}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`text-xs font-medium ${urgency}`}>
                      {d.overdue ? `${Math.abs(d.daysLeft)}d overdue` : d.daysLeft === 0 ? 'Due today' : `${d.daysLeft}d left`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {d.deadline.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
          {deadlines.length > 12 && (
            <div className="px-5 py-2.5 border-t border-gray-50 bg-gray-50">
              <p className="text-xs text-gray-400">+{deadlines.length - 12} more deadlines in next 30 days</p>
            </div>
          )}
        </div>
      )}

      <OverviewCharts stageAnalysis={stageAnalysis} summaries={summaries} />
    </div>
  )
}
