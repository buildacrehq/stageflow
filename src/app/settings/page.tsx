import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { TargetsEditor } from '@/components/ui/TargetsEditor'
import { UsersManager } from '@/components/ui/UsersManager'
import { getUserRole, getCurrentUser } from '@/lib/supabase-server'
import type { StageTarget } from '@/types'

export const revalidate = 0

export default async function SettingsPage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  const currentUser = await getCurrentUser()

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [targetsRes, usersRes] = await Promise.all([
    supabase.from('stage_targets').select('*').order('sort_order'),
    sb.from('profiles').select('id, email, role').order('created_at'),
  ])

  const targets = (targetsRes.data ?? []) as StageTarget[]
  const users = (usersRes.data ?? []) as { id: string; email: string; role: 'admin' | 'staff' }[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Global defaults and user management — admin only</p>
      </div>

      {/* Stage targets */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Default Stage Targets</p>
            <p className="text-xs text-gray-400 mt-0.5">To set different targets for a specific project, open that project and edit its stage targets there</p>
          </div>
          <p className="text-xs text-gray-400 shrink-0 ml-4">Duration per stage · Mob+ auto-calculated</p>
        </div>
        <TargetsEditor targets={targets} />
      </div>

      {/* Users */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Users</p>
          <p className="text-xs text-gray-400 mt-0.5">Manage who is admin and who is staff. Staff cannot access Settings.</p>
        </div>
        {users.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No users found. Make sure the profiles table has data.</p>
        ) : (
          <UsersManager users={users} currentUserId={currentUser?.id ?? ''} />
        )}
      </div>
    </div>
  )
}
