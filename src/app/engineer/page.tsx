import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserRole } from '@/lib/supabase-server'
import Link from 'next/link'
import type { StageStatusRow } from '@/types'
import { visibleStructureStages, FINISHING_STAGES } from '@/lib/constants'

export const revalidate = 0

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function EngineerDashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const role = await getUserRole()
  if (role !== 'site_engineer') redirect('/')

  const client = sb()

  const { data: assignments } = await client
    .from('site_engineer_projects')
    .select('project_id')
    .eq('user_id', user.id)
    .is('removed_at', null)

  const projectIds = (assignments ?? []).map(a => a.project_id)

  if (projectIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-gray-500 font-medium">No projects assigned yet</p>
        <p className="text-xs text-gray-400 mt-1">Contact your coordinator to get projects assigned.</p>
      </div>
    )
  }

  const [projectsRes, stagesRes, targetsRes] = await Promise.all([
    client.from('projects').select('id, client_name, location, mob_date, status, floors, plot_size').in('id', projectIds),
    client.from('stage_status_view').select('*').in('project_id', projectIds),
    client.from('stage_targets').select('stage_name, target_days, sort_order').order('sort_order'),
  ])

  const projects = projectsRes.data ?? []
  const allStages = (stagesRes.data ?? []) as StageStatusRow[]
  const targets = targetsRes.data ?? []

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const in14 = new Date(today.getTime() + 14 * 86400000)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">My Projects</h1>
        <p className="text-sm text-gray-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''} assigned to you</p>
      </div>

      <div className="space-y-4">
        {projects.map(p => {
          const stages = allStages.filter(s => s.project_id === p.id)
          const doneStages = stages.filter(s => s.completed_date)
          const delayedStages = doneStages.filter(s => s.stage_status === 'delayed')
          const totalVisible = visibleStructureStages(p.floors).length + FINISHING_STAGES.length
          const pct = Math.min(100, Math.round((doneStages.length / totalVisible) * 100))

          // Upcoming deadlines (next 14 days)
          const completedNames = new Set(doneStages.map(s => s.stage_name))
          const upcoming: { stage: string; daysLeft: number }[] = []
          if (p.mob_date) {
            const mob = new Date(p.mob_date)
            for (const t of targets) {
              if (completedNames.has(t.stage_name)) continue
              const dl = new Date(mob.getTime() + t.target_days * 86400000)
              const daysLeft = Math.round((dl.getTime() - today.getTime()) / 86400000)
              if (daysLeft >= 0 && dl <= in14) upcoming.push({ stage: t.stage_name, daysLeft })
            }
            upcoming.sort((a, b) => a.daysLeft - b.daysLeft)
          }

          // Current stage (next incomplete)
          const nextStage = targets.find(t => !completedNames.has(t.stage_name))

          return (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{p.client_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.location ?? '—'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  p.status === 'active' ? 'bg-green-100 text-green-700' :
                  p.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {p.status}
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>{doneStages.length} of {totalVisible} stages done</span>
                  <span className="font-medium">{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800">{doneStages.length}</p>
                  <p className="text-xs text-gray-400">Done</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-semibold ${delayedStages.length > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                    {delayedStages.length}
                  </p>
                  <p className="text-xs text-gray-400">Delayed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800">{p.mob_date ? new Date(p.mob_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</p>
                  <p className="text-xs text-gray-400">Mob date</p>
                </div>
              </div>

              {/* Current stage */}
              {nextStage && (
                <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-gray-400">Current stage</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{nextStage.stage_name}</p>
                </div>
              )}

              {/* Upcoming deadlines */}
              {upcoming.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">Upcoming deadlines (14 days)</p>
                  {upcoming.map(u => (
                    <div key={u.stage} className="flex items-center justify-between text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <span className="text-amber-800 font-medium">{u.stage}</span>
                      <span className={`font-medium ${u.daysLeft <= 3 ? 'text-red-600' : 'text-amber-700'}`}>
                        {u.daysLeft === 0 ? 'Today' : `${u.daysLeft}d left`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href={`/engineer/project/${p.id}`}
                className="block text-center text-xs text-green-700 hover:text-green-900 font-medium border border-green-200 rounded-lg py-2 hover:bg-green-50 transition-colors"
              >
                View all stages →
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
