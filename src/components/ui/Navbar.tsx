'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Building2, LineChart, Settings, LogOut, Menu, X } from 'lucide-react'
import { useTransition, useState } from 'react'
import { signOut } from '@/app/actions'

const ALL_NAV = [
  { href: '/',         label: 'Overview', icon: BarChart2,  adminOnly: false },
  { href: '/projects', label: 'Projects', icon: Building2,  adminOnly: false },
  { href: '/analysis', label: 'Analysis', icon: LineChart,  adminOnly: false },
  { href: '/settings', label: 'Settings', icon: Settings,   adminOnly: true  },
]

function NavLinks({ path, isAdmin, onNavigate }: { path: string; isAdmin: boolean; onNavigate?: () => void }) {
  const nav = ALL_NAV.filter(n => !n.adminOnly || isAdmin)
  return (
    <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = path === href || (href !== '/' && path.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-green-50 text-green-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function LogoutButton({ isPending, onLogout }: { isPending: boolean; onLogout: () => void }) {
  return (
    <button
      onClick={onLogout}
      disabled={isPending}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
    >
      <LogOut size={15} />
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}

function UserBadge({ email, role }: { email: string; role: 'admin' | 'site_engineer' }) {
  return (
    <div className="px-3 py-2 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
          role === 'admin' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
        }`}>
          {role === 'admin' ? 'Admin' : 'Site Engineer'}
        </span>
      </div>
      <p className="text-[10px] text-gray-400 truncate">{email}</p>
    </div>
  )
}

export function Navbar({ userEmail, role }: { userEmail: string; role: 'admin' | 'site_engineer' }) {
  const path = usePathname()
  const [isPending, startTransition] = useTransition()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isAdmin = role === 'admin'

  function handleLogout() {
    startTransition(async () => { await signOut() })
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex-col z-20">
        <div className="px-5 py-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">StageFlow</div>
              <div className="text-[10px] text-gray-400">BuildAcre</div>
            </div>
          </Link>
        </div>

        <NavLinks path={path} isAdmin={isAdmin} />

        <div className="px-3 py-3 border-t border-gray-100 space-y-2">
          <UserBadge email={userEmail} role={role} />
          <LogoutButton isPending={isPending} onLogout={handleLogout} />
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center">
            <Building2 size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">StageFlow</span>
        </Link>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* ── Mobile drawer ───────────────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white flex flex-col shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <Link href="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center">
                  <Building2 size={14} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">StageFlow</div>
                  <div className="text-[10px] text-gray-400">BuildAcre</div>
                </div>
              </Link>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <NavLinks path={path} isAdmin={isAdmin} onNavigate={() => setDrawerOpen(false)} />

            <div className="px-3 py-3 border-t border-gray-100 space-y-2">
              <UserBadge email={userEmail} role={role} />
              <LogoutButton isPending={isPending} onLogout={handleLogout} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
