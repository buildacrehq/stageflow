import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { ProjectForm } from '@/components/ui/ProjectForm'
import { ProjectTargetsEditor } from '@/components/ui/ProjectTargetsEditor'
import { ProjectTeamPanel } from '@/components/ui/ProjectTeamPanel'
import { getUserRole, getCurrentUser } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Project, StageTarget, ProjectStageOverride } from '@/types'

export const revalidate = 0

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const role = await getUserRole()

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Coordinators can only edit projects assigned to them
  if (role === 'coordinator') {
    const user = await getCurrentUser()
    if (!user) redirect('/login')
    const { data } = await sb
      .from('coordinator_projects')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('project_id', id)
      .is('removed_at', null)
      .maybeSingle()
    if (!data) redirect('/coordinator/projects')
  }

  const [projectRes, targetsRes, overridesRes] = await Promise.all([
    sb.from('projects').select('*').eq('id', id).single(),
    sb.from('stage_targets').select('*').order('sort_order'),
    sb.from('project_stage_overrides').select('*').eq('project_id', id),
  ])

  if (!projectRes.data) notFound()

  const project = projectRes.data as Project
  const targets = (targetsRes.data ?? []) as StageTarget[]
  const overrides = (overridesRes.data ?? []) as ProjectStageOverride[]

  // Team assignment data — admin sees all roles, coordinator sees engineers/managers/clients (not coordinators)
  let allCoordinators: { id: string; name: string }[] = []
  let assignedCoordinators: { id: string; name: string }[] = []
  let coordinatorHistory: { name: string; assigned_at: string | null; removed_at: string }[] = []
  let allEngineers: { id: string; name: string }[] = []
  let assignedEngineers: { id: string; name: string }[] = []
  let engineerHistory: { name: string; assigned_at: string | null; removed_at: string }[] = []
  let allManagers: { id: string; name: string }[] = []
  let assignedManagers: { id: string; name: string }[] = []
  let managerHistory: { name: string; assigned_at: string | null; removed_at: string }[] = []
  let allClients: { id: string; name: string }[] = []
  let assignedClients: { id: string; name: string }[] = []

  if (role === 'admin' || role === 'coordinator') {
    const [profilesRes, coordAssignRes, engAssignRes, mgrAssignRes, clientAssignRes] = await Promise.all([
      sb.from('profiles').select('id, name, role').order('name'),
      sb.from('coordinator_projects').select('user_id, assigned_at, removed_at').eq('project_id', id),
      sb.from('site_engineer_projects').select('user_id, assigned_at, removed_at').eq('project_id', id),
      sb.from('project_manager_projects').select('user_id, assigned_at, removed_at').eq('project_id', id),
      sb.from('client_projects').select('user_id').eq('project_id', id),
    ])
    const profileMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p as { id: string; name: string; role: string }]))
    allCoordinators = (profilesRes.data ?? []).filter(p => p.role === 'coordinator').map(p => ({ id: p.id, name: p.name as string }))
    allEngineers = (profilesRes.data ?? []).filter(p => p.role === 'site_engineer').map(p => ({ id: p.id, name: p.name as string }))
    allManagers = (profilesRes.data ?? []).filter(p => p.role === 'project_manager').map(p => ({ id: p.id, name: p.name as string }))
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

    const mgrAssignments = mgrAssignRes.data ?? []
    const assignedMgrIds = new Set(mgrAssignments.filter(r => !r.removed_at).map(r => r.user_id))
    assignedManagers = allManagers.filter(m => assignedMgrIds.has(m.id))
    managerHistory = mgrAssignments
      .filter(r => r.removed_at)
      .sort((a, b) => new Date(b.removed_at as string).getTime() - new Date(a.removed_at as string).getTime())
      .map(r => ({ name: profileMap[r.user_id]?.name ?? 'Unknown', assigned_at: r.assigned_at as string | null, removed_at: r.removed_at as string }))

    const assignedClientIds = new Set((clientAssignRes.data ?? []).map(r => r.user_id))
    assignedClients = allClients.filter(c => assignedClientIds.has(c.id))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Edit Project</h1>
          <p className="text-sm text-gray-500 mt-0.5">{project.client_name}</p>
        </div>
      </div>

      {/* Project details form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <ProjectForm project={project} />
      </div>

      {/* Team assignment — admin + coordinator */}
      {(role === 'admin' || role === 'coordinator') && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Project team</p>
          <ProjectTeamPanel
            projectId={id}
            showCoordinators={true}
            readOnlyCoordinators={role === 'coordinator'}
            allCoordinators={allCoordinators}
            initialCoordinators={assignedCoordinators}
            coordinatorHistory={coordinatorHistory}
            allEngineers={allEngineers}
            initialEngineers={assignedEngineers}
            engineerHistory={engineerHistory}
            allManagers={allManagers}
            initialManagers={assignedManagers}
            managerHistory={managerHistory}
            allClients={allClients}
            initialClients={assignedClients}
          />
        </div>
      )}

      {/* Stage timeline overrides — admin + coordinator */}
      {(role === 'admin' || role === 'coordinator') && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-gray-700">Custom stage timeline</p>
              {overrides.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 font-medium rounded-full">
                  {overrides.length} override{overrides.length > 1 ? 's' : ''} active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Adjust target days for individual stages on this project only. Global defaults (in Settings) are not affected.
            </p>
          </div>
          <ProjectTargetsEditor projectId={id} defaults={targets} overrides={overrides} />
        </div>
      )}
    </div>
  )
}
