import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ProjectsTable } from '@/components/ui/ProjectsTable'
import type { ProjectSummary } from '@/types'

export const revalidate = 60

async function getData() {
  const [summaries, allStages, targets] = await Promise.all([
    supabase.from('project_summary_view').select('*').order('mob_date', { ascending: false }),
    supabase.from('project_stages').select('project_id, stage_name, completed_date'),
    supabase.from('stage_targets').select('stage_name, sort_order').order('sort_order'),
  ])
  return {
    projects: (summaries.data ?? []) as ProjectSummary[],
    allStages: allStages.data ?? [],
    targets: targets.data ?? [],
  }
}

export default async function ProjectsPage() {
  const { projects, allStages, targets } = await getData()

  const sortOrderMap = Object.fromEntries(targets.map(t => [t.stage_name, t.sort_order]))

  // Build map: project_id -> rows with any data (completed or just touched), by sort_order
  const stagesByProject = new Map<string, { stage_name: string; sort_order: number; completed: boolean }[]>()
  allStages.forEach(({ project_id, stage_name, completed_date }) => {
    const sort_order = sortOrderMap[stage_name]
    if (sort_order === undefined) return
    if (!stagesByProject.has(project_id)) stagesByProject.set(project_id, [])
    stagesByProject.get(project_id)!.push({ stage_name, sort_order, completed: !!completed_date })
  })

  // Current stage: the furthest-along stage with any data. If that stage isn't
  // completed yet, it's the current stage in progress. If it is completed, the
  // current stage is the next one in sequence — this lets projects whose tracking
  // starts mid-way (e.g. only "SF Lintel" onward has data) show that stage instead
  // of always defaulting back to "Foundation 1".
  const currentStageMap: Record<string, string> = {}
  projects.forEach(p => {
    const rows = (stagesByProject.get(p.id) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
    const lastTouched = rows[rows.length - 1]
    if (!lastTouched) {
      if (targets[0]) currentStageMap[p.id] = targets[0].stage_name
    } else if (!lastTouched.completed) {
      currentStageMap[p.id] = lastTouched.stage_name
    } else {
      const next = targets.find(t => t.sort_order > lastTouched.sort_order)
      currentStageMap[p.id] = next ? next.stage_name : lastTouched.stage_name
    }
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} projects total</p>
        </div>
        <Link
          href="/projects/new"
          className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 transition-colors"
        >
          + New Project
        </Link>
      </div>

      <ProjectsTable projects={projects} currentStageMap={currentStageMap} />
    </div>
  )
}
