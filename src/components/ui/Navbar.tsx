'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Building2, LineChart, Settings, LogOut } from 'lucide-react'
import { useTransition } from 'react'
import { signOut } from '@/app/actions'

const NAV = [
  { href: '/',          label: 'Overview',  icon: BarChart2 },
  { href: '/projects',  label: 'Projects',  icon: Building2 },
  { href: '/analysis',  label: 'Analysis',  icon: LineChart },
  { href: '/settings',  label: 'Settings',  icon: Settings },
]

export function Navbar({ userEmail }: { userEmail: string }) {
  const path = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => { await signOut() })
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Building2 size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">StageFlow</div>
            <div className="text-[10px] text-gray-400">Buildacre</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== '/' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-gray-100 space-y-2">
        <div className="px-3 py-2 bg-gray-50 rounded-lg">
          <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          <LogOut size={15} />
          {isPending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  )
}
