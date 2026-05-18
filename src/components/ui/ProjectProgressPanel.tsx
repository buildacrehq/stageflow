'use client'
import { useState } from 'react'
import Link from 'next/link'

interface ProjectProgress {
  id: string
  client: string
  stagesDone: number
  totalStages: number
  pct: number
  onTimePct: number | null
  stagesDelayed: number
}

const MIN_SHOW = 5

export function ProjectProgressPanel({ projects }: { projects: ProjectProgress[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? projects : projects.slice(0, MIN_SHOW)

  if (projects.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Project completion</p>
          <p className="text-xs text-gray-400 mt-0.5">How many stages done out of total — active projects</p>
        </div>
        <span className="text-xs text-gray-400">{projects.length} projects</span>
      </div>

      <div className="divide-y divide-gray-50">
        {visible.map(p => {
          const barColor = p.stagesDelayed > 0
            ? p.pct >= 80 ? 'bg-amber-400' : 'bg-red-400'
            : 'bg-green-600'

          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.client}</p>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {p.stagesDelayed > 0 && (
                      <span className="text-xs text-red-500">{p.stagesDelayed} delayed</span>
                    )}
                    <span className="text-xs font-semibold text-gray-700 w-10 text-right">{p.pct}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`${barColor} h-1.5 rounded-full transition-all`}
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{p.stagesDone} of {p.totalStages} stages done</p>
              </div>
            </Link>
          )
        })}
      </div>

      {projects.length > MIN_SHOW && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-2.5 text-xs text-gray-400 hover:text-gray-600 bg-gray-50 border-t border-gray-100 text-left"
        >
          {expanded ? 'Show less' : `+ ${projects.length - MIN_SHOW} more projects`}
        </button>
      )}
    </div>
  )
}
