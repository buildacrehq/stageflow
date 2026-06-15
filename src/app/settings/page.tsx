import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlotSizeTargetsEditor } from '@/components/ui/PlotSizeTargetsEditor'
import { UsersManager } from '@/components/ui/UsersManager'
import { getUserRole, getCurrentUser } from '@/lib/supabase-server'
import { AddUserForm } from '@/components/ui/AddUserForm'
import type { StageTarget } from '@/types'

export const revalidate = 0

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const role = await getUserRole()
  if (role !== 'admin' && role !== 'coordinator') redirect('/')

  const isAdmin = role === 'admin'
  const { tab = 'targets' } = await searchParams
  const activeTab = (tab === 'users' && isAdmin) ? 'users' : 'targets'

  const currentUser = await getCurrentUser()

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [targetsRes, plotSizeTargetsRes] = await Promise.all([
    supabase.from('stage_targets').select('*').order('sort_order'),
    sb.from('plot_size_stage_targets').select('*'),
  ])

  const targets = (targetsRes.data ?? []) as StageTarget[]
  const plotSizeTargets = plotSizeTargetsRes.data ?? []

  let users: {
    id: string; name: string; phone: string | null; authEmail: string | null;
    role: 'admin' | 'coordinator' | 'site_engineer' | 'project_manager' | 'client';
    projectId: string | null; coordinatorProjectIds: string[]; engineerProjectIds: string[]; managerProjectIds: string[];
  }[] = []
  let projects: { id: string; client_name: string }[] = []

  if (isAdmin) {
    const [usersRes, clientProjectsRes, coordinatorProjectsRes, seProjectsRes, pmProjectsRes, projectsRes, authListRes] = await Promise.all([
      sb.from('profiles').select('id, name, role, phone').order('created_at'),
      sb.from('client_projects').select('user_id, project_id'),
      sb.from('coordinator_projects').select('user_id, project_id').is('removed_at', null),
      sb.from('site_engineer_projects').select('user_id, project_id').is('removed_at', null),
      sb.from('project_manager_projects').select('user_id, project_id').is('removed_at', null),
      supabase.from('projects').select('id, client_name').order('client_name'),
      sb.auth.admin.listUsers({ perPage: 1000 }),
    ])

    const authEmailMap = Object.fromEntries(
      (authListRes.data?.users ?? []).map(u => [u.id, u.email ?? null])
    )
    const clientProjectMap = Object.fromEntries(
      (clientProjectsRes.data ?? []).map(r => [r.user_id, r.project_id])
    )
    const coordinatorProjectMap: Record<string, string[]> = {}
    for (const r of coordinatorProjectsRes.data ?? []) {
      if (!coordinatorProjectMap[r.user_id]) coordinatorProjectMap[r.user_id] = []
      coordinatorProjectMap[r.user_id].push(r.project_id)
    }
    const seProjectMap: Record<string, string[]> = {}
    for (const r of seProjectsRes.data ?? []) {
      if (!seProjectMap[r.user_id]) seProjectMap[r.user_id] = []
      seProjectMap[r.user_id].push(r.project_id)
    }
    const pmProjectMap: Record<string, string[]> = {}
    for (const r of pmProjectsRes.data ?? []) {
      if (!pmProjectMap[r.user_id]) pmProjectMap[r.user_id] = []
      pmProjectMap[r.user_id].push(r.project_id)
    }
    users = (usersRes.data ?? []).map(u => ({
      id: u.id,
      name: (u.name as string) || '—',
      phone: (u.phone as string | null) ?? null,
      authEmail: authEmailMap[u.id] ?? null,
      role: u.role as 'admin' | 'coordinator' | 'site_engineer' | 'project_manager' | 'client',
      projectId: clientProjectMap[u.id] ?? null,
      coordinatorProjectIds: coordinatorProjectMap[u.id] ?? [],
      engineerProjectIds: seProjectMap[u.id] ?? [],
      managerProjectIds: pmProjectMap[u.id] ?? [],
    }))
    projects = (projectsRes.data ?? []) as { id: string; client_name: string }[]
  }

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeTab === t
        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
        : 'text-gray-500 hover:text-gray-700'
    }`

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">{isAdmin ? 'Global defaults and user management' : 'Plot size stage targets'}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <Link href="/settings?tab=targets" className={tabCls('targets')}>Plot Size Targets</Link>
        {isAdmin && <Link href="/settings?tab=users" className={tabCls('users')}>Users</Link>}
      </div>

      {activeTab === 'targets' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-medium text-gray-700">Plot Size Stage Targets</p>
            <p className="text-xs text-gray-400 mt-0.5">Target days per stage for each plot size. Falls back to global defaults if not set.</p>
          </div>
          <PlotSizeTargetsEditor globalTargets={targets} plotSizeTargets={plotSizeTargets} />
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-medium text-gray-700">Users</p>
            <p className="text-xs text-gray-400 mt-0.5">Admin · Coordinator · Site Engineer · Project Manager · Client — set roles and assign projects.</p>
          </div>
          {users.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No users found. Add one below.</p>
          ) : (
            <UsersManager users={users} currentUserId={currentUser?.id ?? ''} projects={projects} />
          )}
          <AddUserForm />
        </div>
      )}
    </div>
  )
}
