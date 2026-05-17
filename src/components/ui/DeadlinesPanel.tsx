'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Deadline {
  projectId: string
  client: string
  stage: string
  deadline: string // ISO string (Date can't cross server→client boundary)
  daysLeft: number
  overdue: boolean
}

interface Props {
  overdue: Deadline[]
  upcoming: Deadline[]
}

const MIN_SHOW = 6

export function DeadlinesPanel({ overdue, upcoming }: Props) {
  const [overdueExpanded, setOverdueExpanded] = useState(false)
  const [upcomingExpanded, setUpcomingExpanded] = useState(false)

  const overdueVisible = overdueExpanded ? overdue : overdue.slice(0, MIN_SHOW)
  const upcomingVisible = upcomingExpanded ? upcoming : upcoming.slice(0, MIN_SHOW)

  function DeadlineRow({ d }: { d: Deadline }) {
    const urgency = d.overdue
      ? 'text-red-600'
      : d.daysLeft <= 7 ? 'text-amber-600' : 'text-gray-500'
    return (
      <Link
        href={`/projects/${d.projectId}`}
        className={`flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors ${d.overdue ? 'bg-red-50' : ''}`}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{d.client}</p>
          <p className="text-xs text-gray-400 truncate">{d.stage}</p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className={`text-xs font-medium ${urgency}`}>
            {d.overdue
              ? `${Math.abs(d.daysLeft)}d overdue`
              : d.daysLeft === 0 ? 'Due today' : `${d.daysLeft}d left`}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(d.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </p>
        </div>
      </Link>
    )
  }

  if (overdue.length === 0 && upcoming.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Stage deadlines</p>
          <p className="text-xs text-gray-400 mt-0.5">Active projects — incomplete stages</p>
        </div>
        <div className="flex items-center gap-2">
          {overdue.length > 0 && (
            <span className="text-xs px-2.5 py-1 bg-red-50 text-red-600 font-medium rounded-full">
              {overdue.length} overdue
            </span>
          )}
          {upcoming.length > 0 && (
            <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 font-medium rounded-full">
              {upcoming.length} due soon
            </span>
          )}
        </div>
      </div>

      {/* Overdue section */}
      {overdue.length > 0 && (
        <div>
          <div className="px-5 py-1.5 bg-red-50 border-b border-red-100">
            <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Overdue</p>
          </div>
          <div className="divide-y divide-gray-50">
            {overdueVisible.map((d, i) => <DeadlineRow key={i} d={d} />)}
          </div>
          {overdue.length > MIN_SHOW && (
            <button
              onClick={() => setOverdueExpanded(!overdueExpanded)}
              className="w-full px-5 py-2 text-xs text-gray-400 hover:text-gray-600 bg-gray-50 border-t border-gray-100 text-left"
            >
              {overdueExpanded
                ? 'Show less'
                : `+ ${overdue.length - MIN_SHOW} more overdue`}
            </button>
          )}
        </div>
      )}

      {/* Due soon section */}
      {upcoming.length > 0 && (
        <div>
          <div className={`px-5 py-1.5 bg-amber-50 border-b border-amber-100 ${overdue.length > 0 ? 'border-t border-gray-100' : ''}`}>
            <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Due in next 30 days</p>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingVisible.map((d, i) => <DeadlineRow key={i} d={d} />)}
          </div>
          {upcoming.length > MIN_SHOW && (
            <button
              onClick={() => setUpcomingExpanded(!upcomingExpanded)}
              className="w-full px-5 py-2 text-xs text-gray-400 hover:text-gray-600 bg-gray-50 border-t border-gray-100 text-left"
            >
              {upcomingExpanded
                ? 'Show less'
                : `+ ${upcoming.length - MIN_SHOW} more due soon`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
