import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserRole } from '@/lib/supabase-server'
import { CoordinatorTeamManager } from '@/components/ui/CoordinatorTeamManager'

export const revalidate = 0

export default async function CoordinatorTeamPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const role = await getUserRole()
  if (role !== 'coordinator') redirect('/')

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Get projects assigned to this coordinator
  const { data: assignments } = await sb
    .from('coordinator_projects')
    .select('project_id')
    .eq('user_id', user.id)
    .is('removed_at', null)
  const projectIds = (assignments ?? []).map(a => a.project_id)

  const [engineersRes, managersRes, clientsRes, projectsRes] = await Promise.all([
    sb.from('profiles').select('id, name').eq('role', 'site_engineer').order('name'),
    sb.from('profiles').select('id, name').eq('role', 'project_manager').order('name'),
    sb.from('profiles').select('id, name').eq('role', 'client').order('name'),
    projectIds.length > 0
      ? sb.from('projects').select('id, client_name').in('id', projectIds).order('client_name')
      : Promise.resolve({ data: [] }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">My Team</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage site engineers, project managers and clients for your projects</p>
      </div>

      <CoordinatorTeamManager
        engineers={engineersRes.data ?? []}
        managers={managersRes.data ?? []}
        clients={clientsRes.data ?? []}
        projects={(projectsRes.data ?? []) as { id: string; client_name: string }[]}
      />
    </div>
  )
}
