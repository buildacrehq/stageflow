'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis, Legend,
} from 'recharts'
import type { StageAnalysis, ProjectSummary, StageStatusRow } from '@/types'
import { CHART_COLORS } from '@/lib/constants'
import Link from 'next/link'

interface Props {
  stageAnalysis: StageAnalysis[]
  summaries: ProjectSummary[]
  allStages: StageStatusRow[]
  bottlenecks: StageAnalysis[]
  atRisk: ProjectSummary[]
  bestProjects: ProjectSummary[]
  worstProjects: ProjectSummary[]
  locationData: { loc: string; total: number; avgDelay: number; projects: string[] }[]
}

export function AnalysisCharts({
  stageAnalysis, summaries, allStages, bottlenecks, atRisk,
  bestProjects, worstProjects, locationData,
}: Props) {

  // Stage delay chart
  const delayData = stageAnalysis
    .filter(s => s.project_count > 0)
    .map(s => ({
      name: s.stage_name.replace(' Wall', ' W').replace(' Roof', ' R').replace('Foundation ', 'Fnd ').replace('Plastering ', 'Pls ').replace('Flooring ', 'Flr ').replace('Plumbing ', 'Plmb '),
      avgDelay: s.avg_delay_days ?? 0,
      onTimePct: s.on_time_pct ?? 0,
      count: s.project_count,
    }))

  // Gap between consecutive structure stage pairs
  const pairs: [string, string][] = [
    ['Foundation 1', 'GF Wall'], ['GF Wall', 'GF Roof'],
    ['GF Roof', 'FF Wall'], ['FF Wall', 'FF Roof'],
    ['FF Roof', 'SF Wall'], ['SF Wall', 'SF Roof'],
  ]
  const gapData = pairs.map(([a, b]) => {
    const aStages = allStages.filter(s => s.stage_name === a && s.completed_date)
    const bStages = allStages.filter(s => s.stage_name === b && s.completed_date)
    const gaps: number[] = []
    aStages.forEach(as => {
      const bs = bStages.find(bs => bs.project_id === as.project_id)
      if (bs?.completed_date && as.completed_date) {
        const diff = (new Date(bs.completed_date).getTime() - new Date(as.completed_date).getTime()) / 86400000
        if (diff > 0 && diff < 180) gaps.push(diff)
      }
    })
    return {
      name: `${a.replace(' Wall',' W').replace(' Roof',' R').replace('Foundation ','Fnd ')} → ${b.replace(' Wall',' W').replace(' Roof',' R')}`,
      avg: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
      n: gaps.length,
    }
  })

  return (
    <div className="space-y-4">
      {/* Stage delay heatmap */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-700 mb-1">Average delay per stage (days over target)</p>
        <p className="text-xs text-gray-400 mb-4">Higher = more problematic stage for your business</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={delayData} margin={{ left: 0, right: 8, top: 4, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 10 }} unit="d" />
            <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}d`, 'Avg delay']} />
            <Bar dataKey="avgDelay" name="Avg delay" radius={[3, 3, 0, 0]}>
              {delayData.map((d, i) => (
                <Cell key={i} fill={d.avgDelay > 30 ? CHART_COLORS.red : d.avgDelay > 15 ? CHART_COLORS.amber : CHART_COLORS.green} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stage-to-stage gap */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700 mb-1">Avg days between consecutive stages</p>
          <p className="text-xs text-gray-400 mb-4">Where time is being spent between milestones</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gapData} margin={{ left: 0, right: 8, top: 4, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} unit="d" />
              <Tooltip formatter={(v) => [`${Number(v)}d`]} />
              <Bar dataKey="avg" name="Avg gap" fill={CHART_COLORS.teal} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Location avg delay */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700 mb-1">Avg delay days by location</p>
          <p className="text-xs text-gray-400 mb-4">Average max delay days per project in each area</p>
          <ResponsiveContainer width="100%" height={Math.max(220, locationData.slice(0, 10).length * 32)}>
            <BarChart
              data={locationData.slice(0, 10)}
              layout="vertical"
              margin={{ left: 80, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} unit="d" domain={[0, 'auto']} />
              <YAxis type="category" dataKey="loc" tick={{ fontSize: 10 }} width={80} />
              <Tooltip formatter={(v) => [`${Number(v)}d`, 'Avg delay']} />
              <Bar dataKey="avgDelay" name="Avg delay" radius={[0, 3, 3, 0]}>
                {locationData.slice(0, 10).map((d, i) => (
                  <Cell key={i} fill={d.avgDelay > 30 ? CHART_COLORS.red : d.avgDelay > 15 ? CHART_COLORS.amber : CHART_COLORS.green} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Best vs Worst + At-risk */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-700 mb-3">Top performers</p>
          <div className="space-y-2">
            {bestProjects.map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <Link href={`/projects/${p.id}`} className="text-xs text-gray-700 hover:text-blue-600 truncate">
                  {p.client_name}
                </Link>
                <span className="text-xs font-medium text-green-700 shrink-0 ml-2">{p.on_time_pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-700 mb-3">Needs attention</p>
          <div className="space-y-2">
            {worstProjects.map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <Link href={`/projects/${p.id}`} className="text-xs text-gray-700 hover:text-blue-600 truncate">
                  {p.client_name}
                </Link>
                <span className="text-xs font-medium text-red-700 shrink-0 ml-2">{p.on_time_pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-700 mb-3">At-risk (active + delayed)</p>
          <div className="space-y-2">
            {atRisk.slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <Link href={`/projects/${p.id}`} className="text-xs text-gray-700 hover:text-blue-600 truncate max-w-[130px]">
                  {p.client_name}
                </Link>
                <span className="text-xs font-medium text-red-600">{p.stages_delayed} delayed</span>
              </div>
            ))}
            {atRisk.length === 0 && <p className="text-xs text-gray-400">No at-risk projects</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
