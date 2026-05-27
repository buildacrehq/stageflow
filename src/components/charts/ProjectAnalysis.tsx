'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import type { StageStatusRow, StageTarget } from '@/types'
import { CHART_COLORS, visibleStructureStages } from '@/lib/constants'

interface Props {
  stages: StageStatusRow[]
  targets: StageTarget[]
  mobDate: string | null
  floors: string | null
}

export function ProjectAnalysis({ stages, targets, mobDate, floors }: Props) {
  const allowedStructure = new Set(visibleStructureStages(floors))
  const visibleTargets = targets.filter(t =>
    t.category === 'finishing' || allowedStructure.has(t.stage_name)
  )
  const stageMap = new Map(stages.map(s => [s.stage_name, s]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Only truly completed stages (have a completed_date)
  const completedData = visibleTargets
    .filter(t => stageMap.get(t.stage_name)?.completed_date != null)
    .map(t => {
      const s = stageMap.get(t.stage_name)!
      return {
        name: t.stage_name
          .replace(' Lintel', ' L').replace(' Roof', ' R')
          .replace('Foundation ', 'Fnd ').replace('Plastering ', 'Pls ')
          .replace('Flooring ', 'Flr ').replace('Plumbing ', 'Plmb ')
          .replace('Electrical ', 'Elec ').replace('Painting ', 'Paint '),
        actual: s.days_from_mob,
        target: t.target_days,
        status: s.stage_status,
        delay: s.delay_days ?? 0,
      }
    })

  // Stages not yet completed — cap at 5
  const upcoming = visibleTargets.filter(t => !stageMap.get(t.stage_name)?.completed_date).slice(0, 5)
  const upcomingWithDates = upcoming.map((t, i) => {
    if (!mobDate) return { stage: t.stage_name, dueDate: null as Date | null, daysLeft: null as number | null, overdue: false, category: t.category, isNext: i === 0 }
    const mob = new Date(mobDate)
    const dueDate = new Date(mob.getTime() + t.target_days * 86400000)
    const daysLeft = Math.round((dueDate.getTime() - today.getTime()) / 86400000)
    return { stage: t.stage_name, dueDate, daysLeft, overdue: daysLeft < 0, category: t.category, isNext: i === 0 }
  })

  const statusColor = (status: string) => {
    if (status === 'on_time') return CHART_COLORS.green
    if (status === 'buffer') return CHART_COLORS.amber
    return CHART_COLORS.red
  }

  if (completedData.length === 0 && upcomingWithDates.length === 0) return null

  return (
    <div className="space-y-4">
      {upcomingWithDates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Upcoming stages</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {mobDate ? 'Expected dates based on mob date + target days' : 'Set mob date to see expected dates'}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingWithDates.map((u, i) => {
              const urgency = u.overdue
                ? 'text-red-600 font-medium'
                : u.daysLeft !== null && u.daysLeft <= 14
                ? 'text-amber-600 font-medium'
                : 'text-gray-500'
              return (
                <div key={i} className={`flex items-center justify-between px-5 py-2.5 ${u.overdue ? 'bg-red-50/60' : u.isNext ? 'bg-green-50/40' : ''}`}>
                  <div className="flex items-center gap-2">
                    {u.isNext && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-700 text-white rounded font-medium shrink-0">Next</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${u.category === 'structure' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                      {u.category}
                    </span>
                    <span className="text-sm text-gray-800">{u.stage}</span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {u.dueDate ? (
                      <>
                        <p className={`text-xs ${urgency}`}>
                          {u.overdue
                            ? `${Math.abs(u.daysLeft!)}d overdue`
                            : u.daysLeft === 0
                            ? 'Due today'
                            : `in ${u.daysLeft}d`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {u.dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">No mob date set</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {completedData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700 mb-1">Actual vs target — completed stages</p>
          <p className="text-xs text-gray-400 mb-4">Green = on time · Amber = buffer · Red = delayed</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={completedData} margin={{ left: 0, right: 8, top: 4, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} unit="d" />
              <Tooltip
                formatter={(value, name) => [`${Number(value)}d`, name === 'actual' ? 'Actual' : 'Target']}
              />
              <Bar dataKey="actual" name="actual" radius={[3, 3, 0, 0]}>
                {completedData.map((d, i) => (
                  <Cell key={i} fill={statusColor(d.status)} />
                ))}
              </Bar>
              {completedData.map((d, i) => (
                <ReferenceLine
                  key={i}
                  x={d.name}
                  y={d.target}
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  opacity={0.5}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
