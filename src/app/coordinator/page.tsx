import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserRole } from '@/lib/supabase-server'
import Link from 'next/link'
import { KpiCard } from '@/components/ui/KpiCard'
import { ProjectProgressPanel } from '@/components/ui/ProjectProgressPanel'
import { DeadlinesPanel } from '@/components/ui/DeadlinesPanel'
import { visibleStructureStages, FINISHING_STAGES } from '@/lib/constants'
import type { StageStatusRow, ProjectSummary } from '@/types'

export const revalidate = 0

export default async function CoordinatorPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const role = await getUserRole()
  if (role !== 'coordinator') redirect('/')

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: assignments } = await sb
    .from('coordinator_projects')
    .select('project_id')
    .eq('user_id', user.id)

  const projectIds = (assignments ?? []).map(a => a.project_id)

  if (projectIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-gray-500 font-medium">No projects assigned yet</p>
        <p className="text-xs text-gray-400 mt-1">Contact your admin to get projects assigned.</p>
      </div>
    )
  }

  const [projectsRes, stagesRes, summariesRes, targetsRes, completedStagesRes] = await Promise.all([
    sb.from('projects').select('*').in('id', projectIds).order('client_name'),
    sb.from('stage_status_view').select('*').in('project_id', projectIds),
    sb.from('project_summary_view').select('*').in('id', projectIds),
    sb.from('stage_targets').select('stage_name, target_days, sort_order').order('sort_order'),
    sb.from('project_stages').select('project_id, stage_name').not('completed_date', 'is', null).in('project_id', projectIds),
  ])

  const projects = projectsRes.data ?? []
  const allStages = (stagesRes.data ?? []) as StageStatusRow[]
  const summaries = (summariesRes.data ?? []) as ProjectSummary[]
  const targets = targetsRes.data ?? []
  const completedStages = completedStagesRes.data ?? []

  // KPI calculations — active projects only
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

  // Project progress
  const floorsMap = Object.fromEntries(projects.map(p => [p.id, p.floors as string | null]))
  const projectProgress = activeProjects
    .map(p => {
      const floors = floorsMap[p.id] ?? null
      const totalStages = visibleStructureStages(floors).length + FINISHING_STAGES.length
      const progress = Math.min(100, Math.round((p.total_stages_done / totalStages) * 100))
      return {
        id: p.id,
        client: p.client_name,
        stagesDone: p.total_stages_done,
        totalStages,
        pct: progress,
        onTimePct: p.on_time_pct,
        stagesDelayed: p.stages_delayed,
      }
    })
    .sort((a, b) => b.pct - a.pct)

  // Deadlines
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
        const entry = { projectId: p.id, client: p.client_name, stage: t.stage_name, deadline: dl.toISOString(), daysLeft, overdue: daysLeft < 0 }
        if (daysLeft < 0) overdue.push(entry)
        else if (dl <= in30) upcoming.push(entry)
      }
    })

  overdue.sort((a, b) => b.daysLeft - a.daysLeft)
  upcoming.sort((a, b) => a.daysLeft - b.daysLeft)

  const totalCount = summaries.length
  const activeCount = activeProjects.length
  const completedCount = summaries.filter(p => p.status === 'completed').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">My Projects</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {totalCount} project{totalCount !== 1 ? 's' : ''} assigned · milestone stats show active projects only
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total Projects"
          value={totalCount}
          sub={`${activeCount} active · ${completedCount} done`}
        />
        <KpiCard
          label="On Time"
          value={pct(onTime)}
          sub={`${onTime} milestones`}
          color="text-green-700"
        />
        <KpiCard
          label="Delayed"
          value={pct(delayed)}
          sub={`${delayed} overdue stages`}
          color="text-red-700"
        />
        <KpiCard
          label="Avg Delay"
          value={avgDelay > 0 ? `+${avgDelay}d` : '—'}
          sub={avgDelay > 0 ? `avg across ${delayedProjects.length} delayed` : 'no delays recorded'}
          color={avgDelay > 30 ? 'text-red-700' : avgDelay > 15 ? 'text-amber-700' : 'text-gray-700'}
        />
      </div>

      {/* Project progress */}
      <ProjectProgressPanel projects={projectProgress} />

      {/* Deadlines */}
      <DeadlinesPanel overdue={overdue} upcoming={upcoming} />

      {/* Project cards */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">All projects</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(project => {
            const stages = allStages.filter(s => s.project_id === project.id)
            const allowedStructure = new Set(visibleStructureStages(project.floors))
            const visibleStages = stages.filter(s =>
              s.category === 'finishing' || allowedStructure.has(s.stage_name)
            )
            const done = visibleStages.filter(s => s.completed_date).length
            const total = visibleStages.length
            const progress = total > 0 ? Math.round((done / total) * 100) : 0
            const delayedCount = visibleStages.filter(s => s.stage_status === 'delayed').length

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-green-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">{project.client_name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{project.location ?? 'No location'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    project.status === 'active' ? 'bg-green-50 text-green-700'
                    : project.status === 'completed' ? 'bg-gray-100 text-gray-500'
                    : 'bg-amber-50 text-amber-700'
                  }`}>{project.status}</span>
                </div>

                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Progress</span>
                    <span className="text-xs font-semibold text-gray-700">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${delayedCount > 0 ? 'bg-red-400' : 'bg-green-600'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {done}/{total} stages done{delayedCount > 0 ? ` · ${delayedCount} delayed` : ''}
                  </p>
                </div>

                {project.mob_date && (
                  <p className="text-xs text-gray-400">
                    Mob: {new Date(project.mob_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
