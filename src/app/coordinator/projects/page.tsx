import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserRole } from '@/lib/supabase-server'
import { ProjectsTable } from '@/components/ui/ProjectsTable'
import { parseCategoryParam, categoryTabCls } from '@/lib/dataCategory'
import type { ProjectSummary } from '@/types'

export const revalidate = 0

export default async function CoordinatorProjectsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
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

  const [summariesRes, completedStagesRes, targetsRes] = await Promise.all([
    sb.from('project_summary_view').select('*').in('id', projectIds).order('mob_date', { ascending: false }),
    sb.from('project_stages').select('project_id, stage_name').not('completed_date', 'is', null).in('project_id', projectIds),
    sb.from('stage_targets').select('stage_name, sort_order').order('sort_order'),
  ])

  const allProjects = (summariesRes.data ?? []) as ProjectSummary[]
  const completedStages = completedStagesRes.data ?? []
  const targets = targetsRes.data ?? []

  const { category } = await searchParams
  const activeCategory = parseCategoryParam(category)
  const projects = activeCategory === 'all' ? allProjects : allProjects.filter(p => p.data_category === activeCategory)

  const completedMap = new Map<string, Set<string>>()
  completedStages.forEach(({ project_id, stage_name }) => {
    if (!completedMap.has(project_id)) completedMap.set(project_id, new Set())
    completedMap.get(project_id)!.add(stage_name)
  })

  const currentStageMap: Record<string, string> = {}
  projects.forEach(p => {
    const done = completedMap.get(p.id) ?? new Set()
    const next = targets.find(t => !done.has(t.stage_name))
    if (next) currentStageMap[p.id] = next.stage_name
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <Link href="/coordinator/projects?category=tracked" className={categoryTabCls(activeCategory, 'tracked')}>Tracked</Link>
          <Link href="/coordinator/projects?category=reference" className={categoryTabCls(activeCategory, 'reference')}>Reference</Link>
          <Link href="/coordinator/projects?category=all" className={categoryTabCls(activeCategory, 'all')}>All</Link>
        </div>
      </div>
      <ProjectsTable
        projects={projects}
        currentStageMap={currentStageMap}
      />
    </div>
  )
}
