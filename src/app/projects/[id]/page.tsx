import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { ProjectGantt } from '@/components/charts/ProjectGantt'
import { StageEditor } from '@/components/ui/StageEditor'
import { ProjectAnalysis } from '@/components/charts/ProjectAnalysis'
import { ProjectHeader } from '@/components/ui/ProjectHeader'
import { getCurrentUser, getUserRole, getAssignedTeam } from '@/lib/supabase-server'
import type { StageStatusRow, StageTarget } from '@/types'

export const revalidate = 0

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getData(id: string) {
  const client = sb()
  const [projectRes, stagesRes, targetsRes, stageDataRes, coordAssignRes] = await Promise.all([
    client.from('projects').select('*').eq('id', id).single(),
    client.from('stage_status_view').select('*').eq('project_id', id).order('sort_order'),
    client.from('stage_targets').select('*').order('sort_order'),
    client.from('project_stages').select('stage_name, notes, payment_date').eq('project_id', id),
    client.from('coordinator_projects').select('user_id').eq('project_id', id).is('removed_at', null).limit(1).maybeSingle(),
  ])
  let coordinatorName: string | null = null
  let coordinatorPhone: string | null = null
  if (coordAssignRes.data?.user_id) {
    const { data: profile } = await client.from('profiles').select('name, phone').eq('id', coordAssignRes.data.user_id).single()
    coordinatorName = (profile?.name as string) ?? null
    coordinatorPhone = (profile?.phone as string) ?? null
  }
  return {
    project: projectRes.data,
    stages: (stagesRes.data ?? []) as StageStatusRow[],
    targets: (targetsRes.data ?? []) as StageTarget[],
    stageNotes: Object.fromEntries(
      (stageDataRes.data ?? []).map(r => [r.stage_name, r.notes as string | null])
    ) as Record<string, string | null>,
    stagePayments: Object.fromEntries(
      (stageDataRes.data ?? []).map(r => [r.stage_name, r.payment_date as string | null])
    ) as Record<string, string | null>,
    coordinatorName,
    coordinatorPhone,
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getCurrentUser()
  const role = await getUserRole()

  // Clients: only allow access to their assigned project
  if (role === 'client' && user) {
    const client = sb()
    const { data } = await client
      .from('client_projects')
      .select('project_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!data || data.project_id !== id) notFound()
  }

  // Coordinators: verify they are actively assigned to this project
  if (role === 'coordinator' && user) {
    const client = sb()
    const { data } = await client
      .from('coordinator_projects')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('project_id', id)
      .is('removed_at', null)
      .maybeSingle()
    if (!data) redirect('/coordinator')
  }

  const { project, stages, targets, stageNotes, stagePayments, coordinatorName, coordinatorPhone } = await getData(id)
  if (!project) notFound()

  const { engineers, managers } = await getAssignedTeam(sb(), id)

  const doneStages = stages.filter(s => s.completed_date)
  const onTime = doneStages.filter(s => s.stage_status === 'on_time').length
  const buffer = doneStages.filter(s => s.stage_status === 'buffer').length
  const delayed = doneStages.filter(s => s.stage_status === 'delayed').length

  const backHref = role === 'coordinator' ? '/coordinator/projects' : '/projects'
  const backLabel = role === 'coordinator' ? '← My Projects' : '← Projects'

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={project}
        backHref={backHref}
        backLabel={backLabel}
        onTime={onTime}
        buffer={buffer}
        delayed={delayed}
        role={role}
        coordinatorName={coordinatorName}
        coordinatorPhone={coordinatorPhone}
        engineers={engineers}
        managers={managers}
      />

      {/* Gantt */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-700 mb-4">Stage timeline</p>
        <ProjectGantt stages={stages} />
      </div>

      {/* Per-project analysis */}
      <ProjectAnalysis stages={stages} targets={targets} mobDate={project.mob_date} floors={project.floors} />

      {/* Stage table with edit */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Stage details</p>
          <p className="text-xs text-gray-400">Click a date to edit</p>
        </div>
        <StageEditor
          projectId={id}
          stages={stages}
          targets={targets}
          mobDate={project.mob_date}
          floors={project.floors}
          stageNotes={stageNotes}
          stagePayments={stagePayments}
        />
      </div>

    </div>
  )
}
