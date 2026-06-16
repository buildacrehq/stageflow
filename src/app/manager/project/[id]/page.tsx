import { redirect, notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserRole, getAssignedTeam } from '@/lib/supabase-server'
import { ProjectHeader } from '@/components/ui/ProjectHeader'
import { ProjectGantt } from '@/components/charts/ProjectGantt'
import { ProjectAnalysis } from '@/components/charts/ProjectAnalysis'
import { StageEditor } from '@/components/ui/StageEditor'
import type { StageStatusRow, StageTarget } from '@/types'

export const revalidate = 0

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function ManagerProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const role = await getUserRole()
  if (role !== 'project_manager') redirect('/')

  const client = sb()

  const { data: assignment } = await client
    .from('project_manager_projects')
    .select('project_id')
    .eq('user_id', user.id)
    .eq('project_id', id)
    .is('removed_at', null)
    .maybeSingle()
  if (!assignment) redirect('/manager')

  const [projectRes, stagesRes, targetsRes, stageDataRes, coordAssignRes] = await Promise.all([
    client.from('projects').select('*').eq('id', id).single(),
    client.from('stage_status_view').select('*').eq('project_id', id).order('sort_order'),
    client.from('stage_targets').select('*').order('sort_order'),
    client.from('project_stages').select('stage_name, notes, payment_date').eq('project_id', id),
    client.from('coordinator_projects').select('user_id').eq('project_id', id).is('removed_at', null).limit(1).maybeSingle(),
  ])

  if (!projectRes.data) notFound()

  const project = projectRes.data
  const stages = (stagesRes.data ?? []) as StageStatusRow[]
  const targets = (targetsRes.data ?? []) as StageTarget[]
  const stageNotes = Object.fromEntries(
    (stageDataRes.data ?? []).map(r => [r.stage_name, r.notes as string | null])
  )
  const stagePayments = Object.fromEntries(
    (stageDataRes.data ?? []).map(r => [r.stage_name, r.payment_date as string | null])
  )
  let coordinatorName: string | null = null
  let coordinatorPhone: string | null = null
  if (coordAssignRes.data?.user_id) {
    const { data: profile } = await client.from('profiles').select('name, phone').eq('id', coordAssignRes.data.user_id).single()
    coordinatorName = (profile?.name as string) ?? null
    coordinatorPhone = (profile?.phone as string) ?? null
  }
  const { engineers, managers } = await getAssignedTeam(client, id)

  const doneStages = stages.filter(s => s.completed_date)
  const onTime = doneStages.filter(s => s.stage_status === 'on_time').length
  const buffer = doneStages.filter(s => s.stage_status === 'buffer').length
  const delayed = doneStages.filter(s => s.stage_status === 'delayed').length

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={project}
        backHref="/manager"
        backLabel="← My Projects"
        onTime={onTime}
        buffer={buffer}
        delayed={delayed}
        role="project_manager"
        coordinatorName={coordinatorName}
        coordinatorPhone={coordinatorPhone}
        engineers={engineers}
        managers={managers}
      />

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-700 mb-4">Stage timeline</p>
        <ProjectGantt stages={stages} />
      </div>

      <ProjectAnalysis stages={stages} targets={targets} mobDate={project.mob_date} floors={project.floors} />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Stage details</p>
        </div>
        <StageEditor
          projectId={id}
          stages={stages}
          targets={targets}
          mobDate={project.mob_date}
          floors={project.floors}
          stageNotes={stageNotes}
          stagePayments={stagePayments}
          readOnly
          hidePayments
        />
      </div>
    </div>
  )
}
