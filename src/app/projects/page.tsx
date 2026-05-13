import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { ProjectSummary } from '@/types'

export const revalidate = 60

async function getData() {
  const { data } = await supabase
    .from('project_summary_view')
    .select('*')
    .order('mob_date', { ascending: false })
  return (data ?? []) as ProjectSummary[]
}

export default async function ProjectsPage() {
  const projects = await getData()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} projects total</p>
        </div>
        <Link
          href="/projects/new"
          className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 transition-colors"
        >
          + New Project
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Mob Date</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">Stages Done</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">On Time %</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">Max Delay</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const onTimePct = p.on_time_pct ?? 0
                const pctColor = onTimePct >= 70 ? 'text-green-700' : onTimePct >= 50 ? 'text-amber-700' : 'text-red-700'
                const overallStatus =
                  p.stages_delayed > 0 ? 'delayed' :
                  p.stages_in_buffer > 0 ? 'buffer' :
                  p.stages_on_time > 0 ? 'on_time' : 'no_data'

                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.client_name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.location ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.mob_date ? new Date(p.mob_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{p.total_stages_done}</td>
                    <td className={`px-4 py-3 text-center font-medium ${pctColor}`}>
                      {p.on_time_pct !== null ? `${p.on_time_pct}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.max_delay_days > 0
                        ? <span className="text-red-600 font-medium">+{p.max_delay_days}d</span>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={overallStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${p.id}`}
                        className="text-green-700 hover:text-green-900 text-xs font-medium"
                      >
                        View →
                      </Link>
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
