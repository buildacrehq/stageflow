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
  const completedMap = new Map(stages.map(s => [s.stage_name, s]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Actual vs target chart for completed stages
  const completedData = visibleTargets
    .filter(t => completedMap.has(t.stage_name))
    .map(t => {
      const s = completedMap.get(t.stage_name)!
      return {
        name: t.stage_name.replace(' Lintel', ' L').replace(' Roof', ' R')
          .replace('Foundation ', 'Fnd ').replace('Plastering ', 'Pls ')
          .replace('Flooring ', 'Flr ').replace('Plumbing ', 'Plmb ')
          .replace('Electrical ', 'Elec ').replace('Painting ', 'Paint '),
        actual: s.days_from_mob,
        target: t.target_days,
        status: s.stage_status,
        delay: s.delay_days ?? 0,
      }
    })

  // Upcoming stages forecast
  const upcoming = mobDate
    ? visibleTargets
        .filter(t => !completedMap.has(t.stage_name))
        .slice(0, 8)
        .map(t => {
          const mob = new Date(mobDate)
          const dueDate = new Date(mob.getTime() + t.target_days * 86400000)
          const daysLeft = Math.round((dueDate.getTime() - today.getTime()) / 86400000)
          return {
            stage: t.stage_name,
            dueDate,
            daysLeft,
            overdue: daysLeft < 0,
            category: t.category,
          }
        })
    : []

  const statusColor = (status: string) => {
    if (status === 'on_time') return CHART_COLORS.green
    if (status === 'buffer') return CHART_COLORS.amber
    return CHART_COLORS.red
  }

  if (completedData.length === 0 && upcoming.length === 0) return null

  return (
    <div className="space-y-4">
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

      {upcoming.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Upcoming stage schedule</p>
            <p className="text-xs text-gray-400 mt-0.5">Based on mob date + target days</p>
          </div>
          <div className="divide-y divide-gray-50">
            {upcoming.map((u, i) => {
              const urgency = u.overdue
                ? 'text-red-600 font-medium'
                : u.daysLeft <= 14
                ? 'text-amber-600'
                : 'text-gray-500'
              return (
                <div key={i} className={`flex items-center justify-between px-5 py-2.5 ${u.overdue ? 'bg-red-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${u.category === 'structure' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                      {u.category}
                    </span>
                    <span className="text-sm text-gray-700">{u.stage}</span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`text-xs ${urgency}`}>
                      {u.overdue
                        ? `${Math.abs(u.daysLeft)}d overdue`
                        : u.daysLeft === 0
                        ? 'Due today'
                        : `in ${u.daysLeft}d`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {u.dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
