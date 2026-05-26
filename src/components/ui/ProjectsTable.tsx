'use client'
import { useState } from 'react'
import Link from 'next/link'
import { StatusBadge } from './StatusBadge'
import type { ProjectSummary } from '@/types'

interface Props {
  projects: ProjectSummary[]
  currentStageMap: Record<string, string>
  projectManagerMap?: Record<string, string | null>
}

export function ProjectsTable({ projects, currentStageMap, projectManagerMap = {} }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchesSearch = !q
      || p.client_name.toLowerCase().includes(q)
      || (p.location ?? '').toLowerCase().includes(q)
      || (currentStageMap[p.id] ?? '').toLowerCase().includes(q)
      || (projectManagerMap[p.id] ?? '').toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Search by client, location, stage…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Mob Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Project Manager</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Current Stage</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">On Time %</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">Max Delay</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No projects found</td>
                </tr>
              ) : filtered.map(p => {
                const onTimePct = p.on_time_pct ?? 0
                const pctColor = onTimePct >= 70 ? 'text-green-700' : onTimePct >= 50 ? 'text-amber-700' : 'text-red-700'
                const overallStatus =
                  p.stages_delayed > 0 ? 'delayed' :
                  p.stages_in_buffer > 0 ? 'buffer' :
                  p.stages_on_time > 0 ? 'on_time' : 'no_data'
                const currentStage = currentStageMap[p.id]

                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.client_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.location ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.mob_date ? new Date(p.mob_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {projectManagerMap[p.id] ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {currentStage
                        ? <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{currentStage}</span>
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </td>
                    <td className={`px-4 py-3 text-center font-medium text-xs ${pctColor}`}>
                      {p.on_time_pct !== null ? `${p.on_time_pct}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.max_delay_days > 0
                        ? <span className="text-red-600 font-medium text-xs">+{p.max_delay_days}d</span>
                        : <span className="text-gray-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={overallStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/projects/${p.id}`} className="text-green-700 hover:text-green-900 text-xs font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50">
          <p className="text-xs text-gray-400">{filtered.length} of {projects.length} projects</p>
        </div>
      </div>
    </div>
  )
}
