import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserRole } from '@/lib/supabase-server'
import Link from 'next/link'
import { visibleStructureStages } from '@/lib/constants'
import type { StageStatusRow } from '@/types'

export const revalidate = 0

export default async function CoordinatorProjectsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const role = await getUserRole()
  if (role !== 'coordinator') redirect('/')

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: assignments } = await sb
    .from('coordinator_projects').select('project_id').eq('user_id', user.id)
  const projectIds = (assignments ?? []).map(a => a.project_id)

  if (projectIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-gray-500 font-medium">No projects assigned yet</p>
        <p className="text-xs text-gray-400 mt-1">Contact your admin to get projects assigned.</p>
      </div>
    )
  }

  const [projectsRes, stagesRes] = await Promise.all([
    sb.from('projects').select('*').in('id', projectIds).order('client_name'),
    sb.from('stage_status_view').select('*').in('project_id', projectIds),
  ])

  const projects = projectsRes.data ?? []
  const allStages = (stagesRes.data ?? []) as StageStatusRow[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Projects</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {projects.length} project{projects.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map(project => {
          const stages = allStages.filter(s => s.project_id === project.id)
          const allowedStructure = new Set(visibleStructureStages(project.floors))
          const visibleStages = stages.filter(s =>
            s.category === 'finishing' || allowedStructure.has(s.stage_name)
          )
          const done = visibleStages.filter(s => s.completed_date).length
          const total = visibleStages.length
          const progress = total > 0 ? Math.round((done / total) * 100) : 0
          const delayedCount = visibleStages.filter(s => s.stage_status === 'delayed').length
          const onTime = visibleStages.filter(s => s.stage_status === 'on_time').length

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-green-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{project.client_name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{project.location ?? 'No location'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  project.status === 'active' ? 'bg-green-50 text-green-700'
                  : project.status === 'completed' ? 'bg-gray-100 text-gray-500'
                  : 'bg-amber-50 text-amber-700'
                }`}>{project.status.replace('_', ' ')}</span>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Progress</span>
                  <span className="text-xs font-semibold text-gray-700">{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${delayedCount > 0 ? 'bg-red-400' : 'bg-green-600'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{done}/{total} stages done</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {onTime > 0 && <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">{onTime} on time</span>}
                {delayedCount > 0 && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">{delayedCount} delayed</span>}
                {project.mob_date && (
                  <span className="text-xs text-gray-400 ml-auto">
                    Mob: {new Date(project.mob_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
