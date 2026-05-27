import { redirect, notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser, getUserRole } from '@/lib/supabase-server'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'
import type { StageStatusRow, StageTarget } from '@/types'
import { visibleStructureStages, FINISHING_STAGES } from '@/lib/constants'

export const revalidate = 0

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function EngineerProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const role = await getUserRole()
  if (role !== 'site_engineer') redirect('/')

  const client = sb()

  // Verify engineer is assigned to this project
  const { data: assignment } = await client
    .from('site_engineer_projects')
    .select('project_id')
    .eq('user_id', user.id)
    .eq('project_id', id)
    .is('removed_at', null)
    .maybeSingle()
  if (!assignment) redirect('/engineer')

  const [projectRes, stagesRes, targetsRes, stageDataRes] = await Promise.all([
    client.from('projects').select('*').eq('id', id).single(),
    client.from('stage_status_view').select('*').eq('project_id', id).order('sort_order'),
    client.from('stage_targets').select('*').order('sort_order'),
    client.from('project_stages').select('stage_name, notes, payment_date').eq('project_id', id),
  ])

  if (!projectRes.data) notFound()
  const project = projectRes.data
  const stages = (stagesRes.data ?? []) as StageStatusRow[]
  const targets = (targetsRes.data ?? []) as StageTarget[]
  const stageNotes = Object.fromEntries((stageDataRes.data ?? []).map(r => [r.stage_name, r.notes as string | null]))

  const allowedStructure = new Set(visibleStructureStages(project.floors))
  const visibleTargets = targets.filter(t => t.category === 'finishing' || allowedStructure.has(t.stage_name))
  const stageMap = Object.fromEntries(stages.map(s => [s.stage_name, s]))

  const doneStages = stages.filter(s => s.completed_date)
  const delayed = doneStages.filter(s => s.stage_status === 'delayed').length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/engineer" className="text-sm text-gray-400 hover:text-gray-600">← My Projects</Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{project.client_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{project.location ?? '—'}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-semibold text-gray-800">{doneStages.length}</p>
          <p className="text-xs text-gray-400 mt-1">Stages done</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className={`text-2xl font-semibold ${delayed > 0 ? 'text-red-600' : 'text-gray-800'}`}>{delayed}</p>
          <p className="text-xs text-gray-400 mt-1">Delayed</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-gray-800">{project.mob_date ? new Date(project.mob_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
          <p className="text-xs text-gray-400 mt-1">Mob date</p>
        </div>
      </div>

      {/* Stage list — read only */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Stage details</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-140">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Stage</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Completed</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Target</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Days used</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleTargets.map(t => {
                const s = stageMap[t.stage_name]
                const note = stageNotes[t.stage_name]
                return (
                  <>
                    <tr key={t.stage_name} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{t.stage_name}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.category === 'structure' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'
                        }`}>{t.category}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {s?.completed_date
                          ? new Date(s.completed_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-gray-300 italic">Not done</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-400">{t.target_days}d</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">
                        {s?.days_from_mob != null ? `${s.days_from_mob}d` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {s?.stage_status ? <StatusBadge status={s.stage_status} /> : <StatusBadge status="no_data" />}
                      </td>
                    </tr>
                    {note && (
                      <tr key={`note-${t.stage_name}`} className="border-b border-gray-50 bg-amber-50/40">
                        <td colSpan={6} className="px-4 py-1.5">
                          <span className="text-xs text-amber-700">⚠ Delay reason: {note}</span>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
