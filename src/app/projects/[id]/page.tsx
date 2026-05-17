import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ProjectGantt } from '@/components/charts/ProjectGantt'
import { StageEditor } from '@/components/ui/StageEditor'
import { ProjectAnalysis } from '@/components/charts/ProjectAnalysis'
import { ProjectTargetsEditor } from '@/components/ui/ProjectTargetsEditor'
import type { StageStatusRow, StageTarget, ProjectStageOverride } from '@/types'

export const revalidate = 0

async function getData(id: string) {
  const [projectRes, stagesRes, targetsRes, overridesRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('stage_status_view').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('stage_targets').select('*').order('sort_order'),
    supabase.from('project_stage_overrides').select('*').eq('project_id', id),
  ])
  return {
    project: projectRes.data,
    stages: (stagesRes.data ?? []) as StageStatusRow[],
    targets: (targetsRes.data ?? []) as StageTarget[],
    overrides: (overridesRes.data ?? []) as ProjectStageOverride[],
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { project, stages, targets, overrides } = await getData(id)
  if (!project) notFound()

  const doneStages = stages.filter(s => s.completed_date)
  const onTime = doneStages.filter(s => s.stage_status === 'on_time').length
  const buffer = doneStages.filter(s => s.stage_status === 'buffer').length
  const delayed = doneStages.filter(s => s.stage_status === 'delayed').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/projects" className="text-xs text-gray-400 hover:text-gray-600">← Projects</Link>
            <span className="text-gray-200 text-xs">/</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              project.status === 'active' ? 'bg-green-50 text-green-700'
              : project.status === 'completed' ? 'bg-gray-100 text-gray-500'
              : 'bg-amber-50 text-amber-700'
            }`}>{project.status}</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{project.client_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {project.location ?? 'No location'} · Mob:{' '}
            {project.mob_date
              ? new Date(project.mob_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Not set'}
          </p>
          {project.notes && <p className="text-xs text-gray-400 mt-1 italic">{project.notes}</p>}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Link href={`/projects/${id}/edit`} className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-300 transition-colors">
            Edit project
          </Link>
          <div className="flex gap-2">
            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">{onTime} on time</span>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">{buffer} buffer</span>
            <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">{delayed} delayed</span>
          </div>
        </div>
      </div>

      {/* Gantt */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-700 mb-4">Stage timeline</p>
        <ProjectGantt stages={stages} />
      </div>

      {/* Per-project analysis */}
      <ProjectAnalysis stages={stages} targets={targets} mobDate={project.mob_date} />

      {/* Stage table with edit */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Stage details</p>
          <p className="text-xs text-gray-400">Click a date to edit</p>
        </div>
        <StageEditor projectId={id} stages={stages} targets={targets} mobDate={project.mob_date} />
      </div>

      {/* Per-project stage targets */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Stage target days — this project</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Override target days for this project only. Other projects are not affected.
            {overrides.length > 0 && <span className="ml-2 text-blue-600 font-medium">{overrides.length} custom override{overrides.length > 1 ? 's' : ''} set</span>}
          </p>
        </div>
        <ProjectTargetsEditor projectId={id} defaults={targets} overrides={overrides} />
      </div>
    </div>
  )
}
