import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ProjectsTable } from '@/components/ui/ProjectsTable'
import type { ProjectSummary } from '@/types'

export const revalidate = 60

async function getData() {
  const [summaries, completedStages, targets] = await Promise.all([
    supabase.from('project_summary_view').select('*').order('mob_date', { ascending: false }),
    supabase.from('project_stages').select('project_id, stage_name').not('completed_date', 'is', null),
    supabase.from('stage_targets').select('stage_name, sort_order').order('sort_order'),
  ])
  return {
    projects: (summaries.data ?? []) as ProjectSummary[],
    completedStages: completedStages.data ?? [],
    targets: targets.data ?? [],
  }
}

export default async function ProjectsPage() {
  const { projects, completedStages, targets } = await getData()

  // Build map: project_id -> Set of completed stage names
  const completedMap = new Map<string, Set<string>>()
  completedStages.forEach(({ project_id, stage_name }) => {
    if (!completedMap.has(project_id)) completedMap.set(project_id, new Set())
    completedMap.get(project_id)!.add(stage_name)
  })

  // Current stage = first target stage not yet completed
  const currentStageMap: Record<string, string> = {}
  projects.forEach(p => {
    const done = completedMap.get(p.id) ?? new Set()
    const next = targets.find(t => !done.has(t.stage_name))
    if (next) currentStageMap[p.id] = next.stage_name
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
