'use client'
import { FINISHING_STAGES, visibleStructureStages } from '@/lib/constants'
import { StatusBadge } from './StatusBadge'
import type { StageStatusRow, StageTarget } from '@/types'

interface Project {
  id: string
  client_name: string
  location: string | null
  mob_date: string | null
  floors: string | null
  status: string
  notes: string | null
}

interface Props {
  project: Project
  stages: StageStatusRow[]
  targets: StageTarget[]
}

export function ClientProjectView({ project, stages, targets }: Props) {
  const allowedStructure = new Set(visibleStructureStages(project.floors))
  const visibleTargets = targets.filter(t =>
    t.category === 'finishing' || allowedStructure.has(t.stage_name)
  )
  const stageMap = new Map(stages.map(s => [s.stage_name, s]))
  const totalStages = visibleTargets.length
  const doneStages = visibleTargets.filter(t => stageMap.get(t.stage_name)?.completed_date).length
  const pct = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = project.mob_date
    ? visibleTargets
        .filter(t => !stageMap.get(t.stage_name)?.completed_date)
        .slice(0, 5)
        .map(t => {
          const mob = new Date(project.mob_date!)
          const due = new Date(mob.getTime() + t.target_days * 86400000)
          const daysLeft = Math.round((due.getTime() - today.getTime()) / 86400000)
          return { stage: t.stage_name, due, daysLeft, overdue: daysLeft < 0 }
        })
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            project.status === 'active' ? 'bg-green-50 text-green-700'
            : project.status === 'completed' ? 'bg-gray-100 text-gray-500'
            : 'bg-amber-50 text-amber-700'
          }`}>{project.status}</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">{project.client_name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {project.location ?? 'No location'} · Mob:{' '}
          {project.mob_date
            ? new Date(project.mob_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Not set'}
        </p>
        {project.notes && <p className="text-xs text-gray-400 mt-1 italic">{project.notes}</p>}
      </div>

      {/* Completion */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Overall progress</p>
          <span className="text-lg font-bold text-gray-900">{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-green-600 h-3 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{doneStages} of {totalStages} stages completed</p>
      </div>

      {/* Upcoming stages */}
      {upcoming.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Next upcoming stages</p>
          </div>
          <div className="divide-y divide-gray-50">
            {upcoming.map((u, i) => (
              <div key={i} className={`flex items-center justify-between px-5 py-3 ${u.overdue ? 'bg-red-50' : ''}`}>
                <p className="text-sm text-gray-700">{u.stage}</p>
                <div className="text-right">
                  <p className={`text-xs font-medium ${u.overdue ? 'text-red-600' : u.daysLeft <= 14 ? 'text-amber-600' : 'text-gray-500'}`}>
                    {u.overdue ? `${Math.abs(u.daysLeft)}d overdue` : u.daysLeft === 0 ? 'Due today' : `in ${u.daysLeft}d`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {u.due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Stage details</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Stage</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Completed</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleTargets.map(t => {
                const s = stageMap.get(t.stage_name)
                return (
                  <tr key={t.stage_name} className="border-b border-gray-50">
                    <td className="px-5 py-2.5 font-medium text-gray-800">{t.stage_name}</td>
                    <td className="px-5 py-2.5 text-gray-600 text-sm">
                      {s?.completed_date
                        ? new Date(s.completed_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span className="text-gray-300 text-xs">Pending</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {s?.stage_status ? <StatusBadge status={s.stage_status} /> : <StatusBadge status="no_data" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
