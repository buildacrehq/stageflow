'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Legend,
} from 'recharts'
import type { StageAnalysis, ProjectSummary } from '@/types'
import { CHART_COLORS } from '@/lib/constants'

interface Props {
  stageAnalysis: StageAnalysis[]
  summaries: ProjectSummary[]
}

export function OverviewCharts({ stageAnalysis, summaries }: Props) {
  const structureStages = stageAnalysis.filter(s => s.category === 'structure' && s.project_count > 0)
  const finishingStages = stageAnalysis.filter(s => s.category === 'finishing' && s.project_count > 0)

  const abbr = (name: string) => name
    .replace(' Lintel', ' L').replace(' Roof', ' R').replace('Foundation ', 'Fnd ')
    .replace('Plastering ', 'Pls ').replace('Flooring ', 'Flr ').replace('Plumbing ', 'Plmb ')
    .replace('Electrical ', 'Elec ').replace('Painting ', 'Paint ').replace('Doors & Windows', 'Doors')

  const avgDaysData = structureStages.map(s => ({
    name: abbr(s.stage_name),
    actual: s.avg_days_from_mob,
    target: s.target_days,
  }))

  const onTimeData = structureStages.map(s => ({
    name: abbr(s.stage_name),
    pct: s.on_time_pct,
  }))

  const finishingOnTimeData = finishingStages.map(s => ({
    name: abbr(s.stage_name),
    pct: s.on_time_pct,
    avgDelay: s.avg_delay_days ?? 0,
  }))

  // On-time rate per project (for bar chart)
  const projectData = summaries
    .filter(p => p.stages_on_time + p.stages_in_buffer + p.stages_delayed > 0)
    .sort((a, b) => (b.on_time_pct ?? 0) - (a.on_time_pct ?? 0))
    .slice(0, 20)
    .map(p => ({
      name: p.client_name,
      pct: p.on_time_pct,
    }))

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-700 mb-1">
          Avg days from Mobilisation — structure stages
        </p>
        <p className="text-xs text-gray-400 mb-4">Red line = target</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={avgDaysData} margin={{ left: 0, right: 8, top: 4, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 10 }} unit="d" />
            <Tooltip formatter={(v) => [`${Number(v)}d`]} />
            <Bar dataKey="actual" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} name="Avg actual" />
            <Bar dataKey="target" fill="transparent" name="Target" />
            {avgDaysData.map((d, i) => (
              <ReferenceLine key={i} x={d.name} y={d.target ?? 0} stroke={CHART_COLORS.target} strokeWidth={1.5} strokeDasharray="4 3" />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700 mb-1">On-time rate per stage</p>
          <p className="text-xs text-gray-400 mb-4">% completed within target + 7d buffer</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={onTimeData} margin={{ left: 0, right: 8, top: 4, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${Number(v)}%`]} />
              <Bar dataKey="pct" name="On-time %" radius={[3, 3, 0, 0]}>
                {onTimeData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.pct === null ? '#D1D5DB'
                      : d.pct >= 70 ? CHART_COLORS.green
                      : d.pct >= 50 ? CHART_COLORS.amber
                      : CHART_COLORS.red
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700 mb-1">Project on-time rate ranking</p>
          <p className="text-xs text-gray-400 mb-4">% milestones on time or within buffer</p>
          <ResponsiveContainer width="100%" height={Math.max(220, projectData.length * 28)}>
            <BarChart data={projectData} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} />
              <Tooltip formatter={(v) => [`${Number(v)}%`]} />
              <Bar dataKey="pct" name="On-time %" radius={[0, 3, 3, 0]}>
                {projectData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.pct === null ? '#D1D5DB'
                      : d.pct >= 70 ? CHART_COLORS.green
                      : d.pct >= 50 ? CHART_COLORS.amber
                      : CHART_COLORS.red
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {finishingOnTimeData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700 mb-1">On-time rate — finishing stages</p>
          <p className="text-xs text-gray-400 mb-4">% completed within target + buffer across all projects</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={finishingOnTimeData} margin={{ left: 0, right: 8, top: 4, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${Number(v)}%`]} />
              <Bar dataKey="pct" name="On-time %" radius={[3, 3, 0, 0]}>
                {finishingOnTimeData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.pct === null ? '#D1D5DB'
                      : d.pct >= 70 ? CHART_COLORS.green
                      : d.pct >= 50 ? CHART_COLORS.amber
                      : CHART_COLORS.red
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
