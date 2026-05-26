'use client'
import Link from 'next/link'
import { Building2, FolderKanban, LogOut } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { signOut } from '@/app/actions'

export function CoordinatorNavbar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex-col z-20">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">StageFlow</div>
              <div className="text-[10px] text-gray-400">BuildAcre</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/coordinator"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive('/coordinator') || isActive('/projects')
                ? 'bg-green-50 text-green-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <FolderKanban size={16} />
            My Projects
          </Link>
        </nav>

        <div className="px-3 py-3 border-t border-gray-100 space-y-2">
          <div className="px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Coordinator</span>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{userEmail}</p>
          </div>
          <button
            onClick={() => startTransition(async () => { await signOut() })}
            disabled={isPending}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <LogOut size={15} />
            {isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center">
            <Building2 size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">My Projects</span>
        </div>
        <button
          onClick={() => startTransition(async () => { await signOut() })}
          disabled={isPending}
          className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
        >
          <LogOut size={18} />
        </button>
      </div>
    </>
  )
}
