'use client'
import { useState, useTransition, type ReactNode } from 'react'
import { UserCheck, HardHat, User, X, History, Briefcase } from 'lucide-react'
import {
  assignCoordinatorProject, removeCoordinatorProject,
  assignSiteEngineerProject, removeSiteEngineerProject,
  assignClientProject, removeClientProject,
  assignProjectManagerProject, removeProjectManagerProject,
} from '@/app/actions'

interface Person { id: string; name: string }
interface HistoryEntry { name: string; assigned_at: string | null; removed_at: string }

interface Props {
  projectId: string
  showCoordinators: boolean
  readOnlyCoordinators?: boolean
  allCoordinators: Person[]
  initialCoordinators: Person[]
  coordinatorHistory?: HistoryEntry[]
  allEngineers: Person[]
  initialEngineers: Person[]
  engineerHistory?: HistoryEntry[]
  allManagers: Person[]
  initialManagers: Person[]
  managerHistory?: HistoryEntry[]
  allClients: Person[]
  initialClients: Person[]
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function AssignSelect({ placeholder, options, onSelect, disabled }: {
  placeholder: string
  options: Person[]
  onSelect: (p: Person) => void
  disabled: boolean
}) {
  if (options.length === 0) return null
  return (
    <select
      defaultValue=""
      disabled={disabled}
      onChange={e => {
        const id = e.target.value
        if (!id) return
        const p = options.find(o => o.id === id)
        if (p) onSelect(p)
        e.target.value = ''
      }}
      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-500 hover:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-600 cursor-pointer disabled:opacity-50 appearance-none"
    >
      <option value="">+ {placeholder}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  )
}

export function ProjectTeamPanel({
  projectId, showCoordinators, readOnlyCoordinators = false,
  allCoordinators, initialCoordinators, coordinatorHistory = [],
  allEngineers, initialEngineers, engineerHistory = [],
  allManagers, initialManagers, managerHistory = [],
  allClients, initialClients,
}: Props) {
  const [coords, setCoords] = useState(initialCoordinators)
  const [engineers, setEngineers] = useState(initialEngineers)
  const [managers, setManagers] = useState(initialManagers)
  const [clients, setClients] = useState(initialClients)
  const [isPending, startTransition] = useTransition()
  const [showCoordHistory, setShowCoordHistory] = useState(false)
  const [showEngHistory, setShowEngHistory] = useState(false)
  const [showMgrHistory, setShowMgrHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function assign<T extends Person>(
    item: T,
    setter: (fn: (prev: T[]) => T[]) => void,
    action: (id: string, pid: string) => Promise<{ error?: string } | undefined>
  ) {
    setter(prev => [...prev, item])
    setError(null)
    startTransition(async () => {
      const res = await action(item.id, projectId)
      if (res?.error) {
        setter(prev => prev.filter(p => p.id !== item.id))
        setError(res.error)
      }
    })
  }

  function remove<T extends Person>(
    id: string,
    setter: (fn: (prev: T[]) => T[]) => void,
    action: (uid: string, pid: string) => Promise<unknown>
  ) {
    setter(prev => prev.filter(p => p.id !== id))
    setError(null)
    startTransition(async () => { await action(id, projectId) })
  }

  const unassignedCoords = allCoordinators.filter(c => !coords.find(a => a.id === c.id))
  const unassignedEngs = allEngineers.filter(e => !engineers.find(a => a.id === e.id))
  const unassignedMgrs = allManagers.filter(m => !managers.find(a => a.id === m.id))
  const unassignedClients = allClients.filter(c => !clients.find(a => a.id === c.id))

  // Re-assigning the same person isn't a real handover — don't clutter history with it
  const visibleCoordHistory = coordinatorHistory.filter(h => !coords.some(c => c.name === h.name))
  const visibleEngHistory = engineerHistory.filter(h => !engineers.some(e => e.name === h.name))
  const visibleMgrHistory = managerHistory.filter(h => !managers.some(m => m.name === h.name))

  function Chips({ items, color, onRemove, readOnly }: { items: Person[]; color: string; onRemove: (id: string) => void; readOnly?: boolean }) {
    if (items.length === 0) return <p className="text-xs text-gray-400 italic">None assigned</p>
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map(p => (
          <div key={p.id} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${color}`}>
            <span>{p.name}</span>
            {!readOnly && (
              <button onClick={() => onRemove(p.id)} disabled={isPending} className="opacity-50 hover:opacity-100 hover:text-red-500 transition-opacity disabled:opacity-30">
                <X size={10} />
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  function Section({ icon: Icon, label, badgeColor, count, assignSelect, children, history, showHistory, onToggleHistory }: {
    icon: typeof UserCheck
    label: string
    badgeColor: string
    count: number
    assignSelect: ReactNode
    children: ReactNode
    history?: { name: string; assigned_at: string | null; removed_at: string }[]
    showHistory?: boolean
    onToggleHistory?: () => void
  }) {
    return (
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="text-gray-400 shrink-0" />
          <span className="text-xs font-semibold text-gray-600">{label}</span>
          {count > 0 && <span className={`text-xs px-1 py-0.5 rounded font-medium ${badgeColor}`}>{count}</span>}
        </div>
        {assignSelect}
        {children}
        {history && history.length > 0 && (
          <div>
            <button onClick={onToggleHistory} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <History size={10} />{showHistory ? 'Hide' : 'History'} ({history.length})
            </button>
            {showHistory && (
              <div className="mt-1 space-y-0.5">
                {history.map((h, i) => (
                  <div key={i} className="text-xs text-gray-500">{h.name} <span className="text-gray-300">{fmtDate(h.assigned_at)} → {fmtDate(h.removed_at)}</span></div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-gray-100">

        {showCoordinators && (
          <Section
            icon={UserCheck}
            label="Coordinators"
            badgeColor="bg-amber-100 text-amber-700"
            count={coords.length}
            assignSelect={!readOnlyCoordinators && <AssignSelect placeholder="Assign" options={unassignedCoords} onSelect={p => assign(p, setCoords as (fn: (prev: Person[]) => Person[]) => void, assignCoordinatorProject)} disabled={isPending} />}
            history={visibleCoordHistory}
            showHistory={showCoordHistory}
            onToggleHistory={() => setShowCoordHistory(v => !v)}
          >
            <Chips items={coords} color="bg-amber-50 border-amber-200 text-amber-800" readOnly={readOnlyCoordinators} onRemove={id => remove(id, setCoords as (fn: (prev: Person[]) => Person[]) => void, removeCoordinatorProject)} />
          </Section>
        )}

        <Section
          icon={HardHat}
          label="Site Engineers"
          badgeColor="bg-gray-100 text-gray-600"
          count={engineers.length}
          assignSelect={<AssignSelect placeholder="Assign" options={unassignedEngs} onSelect={e => assign(e, setEngineers as (fn: (prev: Person[]) => Person[]) => void, assignSiteEngineerProject)} disabled={isPending} />}
          history={visibleEngHistory}
          showHistory={showEngHistory}
          onToggleHistory={() => setShowEngHistory(v => !v)}
        >
          <Chips items={engineers} color="bg-gray-50 border-gray-200 text-gray-700" onRemove={id => remove(id, setEngineers as (fn: (prev: Person[]) => Person[]) => void, removeSiteEngineerProject)} />
        </Section>

        <Section
          icon={Briefcase}
          label="Proj. Managers"
          badgeColor="bg-purple-100 text-purple-700"
          count={managers.length}
          assignSelect={<AssignSelect placeholder="Assign" options={unassignedMgrs} onSelect={m => assign(m, setManagers as (fn: (prev: Person[]) => Person[]) => void, assignProjectManagerProject)} disabled={isPending} />}
          history={visibleMgrHistory}
          showHistory={showMgrHistory}
          onToggleHistory={() => setShowMgrHistory(v => !v)}
        >
          <Chips items={managers} color="bg-purple-50 border-purple-200 text-purple-800" onRemove={id => remove(id, setManagers as (fn: (prev: Person[]) => Person[]) => void, removeProjectManagerProject)} />
        </Section>

        <Section
          icon={User}
          label="Clients"
          badgeColor="bg-blue-100 text-blue-700"
          count={clients.length}
          assignSelect={<AssignSelect placeholder="Assign" options={unassignedClients} onSelect={c => assign(c, setClients as (fn: (prev: Person[]) => Person[]) => void, assignClientProject)} disabled={isPending} />}
        >
          <Chips items={clients} color="bg-blue-50 border-blue-200 text-blue-700" onRemove={id => remove(id, setClients as (fn: (prev: Person[]) => Person[]) => void, removeClientProject)} />
        </Section>

      </div>
      {error && <p className="text-xs text-red-600 px-4 pb-2">{error}</p>}
    </div>
  )
}
