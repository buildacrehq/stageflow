import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserRole } from '@/lib/supabase-server'
import { ClientProjectView } from '@/components/ui/ClientProjectView'
import type { StageStatusRow, StageTarget } from '@/types'

export const revalidate = 60

export default async function ClientPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const role = await getUserRole()
  if (role !== 'client') redirect('/')

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: assignment } = await sb
    .from('client_projects')
    .select('project_id')
    .eq('user_id', user.id)
    .single()

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-gray-500 font-medium">No project assigned yet</p>
        <p className="text-xs text-gray-400 mt-1">Contact your project manager to get access.</p>
      </div>
    )
  }

  const [projectRes, stagesRes, targetsRes] = await Promise.all([
    sb.from('projects').select('*').eq('id', assignment.project_id).single(),
    sb.from('stage_status_view').select('*').eq('project_id', assignment.project_id).order('sort_order'),
    sb.from('stage_targets').select('*').order('sort_order'),
  ])

  if (!projectRes.data) redirect('/login')

  return (
    <ClientProjectView
      project={projectRes.data}
      stages={(stagesRes.data ?? []) as StageStatusRow[]}
      targets={(targetsRes.data ?? []) as StageTarget[]}
    />
  )
}
