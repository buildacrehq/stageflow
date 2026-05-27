import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { ProjectGantt } from '@/components/charts/ProjectGantt'
import { StageEditor } from '@/components/ui/StageEditor'
import { ProjectAnalysis } from '@/components/charts/ProjectAnalysis'
import { ProjectHeader } from '@/components/ui/ProjectHeader'
import { ProjectCoordinators } from '@/components/ui/ProjectCoordinators'
import { ProjectSiteEngineers } from '@/components/ui/ProjectSiteEngineers'
import { ProjectClientAssignment } from '@/components/ui/ProjectClientAssignment'
import { getCurrentUser, getUserRole } from '@/lib/supabase-server'
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
  const [projectRes, stagesRes, targetsRes, stageDataRes] = await Promise.all([
    client.from('projects').select('*').eq('id', id).single(),
    client.from('stage_status_view').select('*').eq('project_id', id).order('sort_order'),
    client.from('stage_targets').select('*').order('sort_order'),
    client.from('project_stages').select('stage_name, notes, payment_date').eq('project_id', id),
  ])
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

  const { project, stages, targets, stageNotes, stagePayments } = await getData(id)
  if (!project) notFound()

  // Coordinator + site engineer assignment data — admin only for coordinators, admin/coordinator for engineers
  let allCoordinators: { id: string; name: string }[] = []
  let assignedCoordinators: { id: string; name: string }[] = []
  let coordinatorHistory: { name: string; assigned_at: string | null; removed_at: string }[] = []
  let allEngineers: { id: string; name: string }[] = []
  let assignedEngineers: { id: string; name: string }[] = []
  let engineerHistory: { name: string; assigned_at: string | null; removed_at: string }[] = []
  let allClients: { id: string; name: string }[] = []
  let assignedClients: { id: string; name: string }[] = []

  if (role === 'admin') {
    const client = sb()
    // 4 parallel queries instead of 10+ sequential batches
    const [profilesRes, coordAssignRes, engAssignRes, clientAssignRes] = await Promise.all([
      client.from('profiles').select('id, name, role').order('name'),
      client.from('coordinator_projects').select('user_id, assigned_at, removed_at').eq('project_id', id),
      client.from('site_engineer_projects').select('user_id, assigned_at, removed_at').eq('project_id', id),
      client.from('client_projects').select('user_id').eq('project_id', id),
    ])
    const profileMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p as { id: string; name: string; role: string }]))
    allCoordinators = (profilesRes.data ?? []).filter(p => p.role === 'coordinator').map(p => ({ id: p.id, name: p.name as string }))
    allEngineers = (profilesRes.data ?? []).filter(p => p.role === 'site_engineer').map(p => ({ id: p.id, name: p.name as string }))
    allClients = (profilesRes.data ?? []).filter(p => p.role === 'client').map(p => ({ id: p.id, name: p.name as string }))

    const coordAssignments = coordAssignRes.data ?? []
    const assignedCoordIds = new Set(coordAssignments.filter(r => !r.removed_at).map(r => r.user_id))
    assignedCoordinators = allCoordinators.filter(c => assignedCoordIds.has(c.id))
    coordinatorHistory = coordAssignments
      .filter(r => r.removed_at)
      .sort((a, b) => new Date(b.removed_at as string).getTime() - new Date(a.removed_at as string).getTime())
      .map(r => ({ name: profileMap[r.user_id]?.name ?? 'Unknown', assigned_at: r.assigned_at as string | null, removed_at: r.removed_at as string }))

    const engAssignments = engAssignRes.data ?? []
    const assignedEngIds = new Set(engAssignments.filter(r => !r.removed_at).map(r => r.user_id))
    assignedEngineers = allEngineers.filter(e => assignedEngIds.has(e.id))
    engineerHistory = engAssignments
      .filter(r => r.removed_at)
      .sort((a, b) => new Date(b.removed_at as string).getTime() - new Date(a.removed_at as string).getTime())
      .map(r => ({ name: profileMap[r.user_id]?.name ?? 'Unknown', assigned_at: r.assigned_at as string | null, removed_at: r.removed_at as string }))

    const assignedClientIds = new Set((clientAssignRes.data ?? []).map(r => r.user_id))
    assignedClients = allClients.filter(c => assignedClientIds.has(c.id))
  } else if (role === 'coordinator') {
    const client = sb()
    // 3 parallel queries instead of 7
    const [profilesRes, engAssignRes, clientAssignRes] = await Promise.all([
      client.from('profiles').select('id, name, role').in('role', ['site_engineer', 'client']).order('name'),
      client.from('site_engineer_projects').select('user_id, assigned_at, removed_at').eq('project_id', id),
      client.from('client_projects').select('user_id').eq('project_id', id),
    ])
    const profileMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p as { id: string; name: string; role: string }]))
    allEngineers = (profilesRes.data ?? []).filter(p => p.role === 'site_engineer').map(p => ({ id: p.id, name: p.name as string }))
    allClients = (profilesRes.data ?? []).filter(p => p.role === 'client').map(p => ({ id: p.id, name: p.name as string }))

    const engAssignments = engAssignRes.data ?? []
    const assignedEngIds = new Set(engAssignments.filter(r => !r.removed_at).map(r => r.user_id))
    assignedEngineers = allEngineers.filter(e => assignedEngIds.has(e.id))
    engineerHistory = engAssignments
      .filter(r => r.removed_at)
      .sort((a, b) => new Date(b.removed_at as string).getTime() - new Date(a.removed_at as string).getTime())
      .map(r => ({ name: profileMap[r.user_id]?.name ?? 'Unknown', assigned_at: r.assigned_at as string | null, removed_at: r.removed_at as string }))

    const assignedClientIds = new Set((clientAssignRes.data ?? []).map(r => r.user_id))
    assignedClients = allClients.filter(c => assignedClientIds.has(c.id))
  }

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
      />

      {/* Coordinator assignment — admin only */}
      {role === 'admin' && (
        <ProjectCoordinators
          projectId={id}
          allCoordinators={allCoordinators}
          initialAssigned={assignedCoordinators}
          history={coordinatorHistory}
        />
      )}

      {/* Site engineer assignment — admin + coordinator */}
      {(role === 'admin' || role === 'coordinator') && (
        <ProjectSiteEngineers
          projectId={id}
          allEngineers={allEngineers}
          initialAssigned={assignedEngineers}
          history={engineerHistory}
        />
      )}

      {/* Client assignment — admin + coordinator */}
      {(role === 'admin' || role === 'coordinator') && (
        <ProjectClientAssignment
          projectId={id}
          allClients={allClients}
          initialAssigned={assignedClients}
        />
      )}

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
