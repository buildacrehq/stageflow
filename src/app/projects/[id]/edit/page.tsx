import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { ProjectForm } from '@/components/ui/ProjectForm'
import { ProjectTargetsEditor } from '@/components/ui/ProjectTargetsEditor'
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

  const [projectRes, targetsRes, overridesRes, engineersRes, managersRes] = await Promise.all([
    sb.from('projects').select('*').eq('id', id).single(),
    sb.from('stage_targets').select('*').order('sort_order'),
    sb.from('project_stage_overrides').select('*').eq('project_id', id),
    sb.from('profiles').select('id, name, phone').eq('role', 'site_engineer').order('name'),
    sb.from('profiles').select('id, name, phone').eq('role', 'project_manager').order('name'),
  ])

  if (!projectRes.data) notFound()

  const project = projectRes.data as Project
  const targets = (targetsRes.data ?? []) as StageTarget[]
  const overrides = (overridesRes.data ?? []) as ProjectStageOverride[]
  const engineers = (engineersRes.data ?? []) as { id: string; name: string; phone: string | null }[]
  const managers = (managersRes.data ?? []) as { id: string; name: string; phone: string | null }[]

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
        <ProjectForm project={project} engineers={engineers} managers={managers} />
      </div>

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
