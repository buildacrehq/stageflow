import { supabase } from '@/lib/supabase'
import { TargetsEditor } from '@/components/ui/TargetsEditor'
import type { StageTarget } from '@/types'

export const revalidate = 0

export default async function SettingsPage() {
  const { data } = await supabase
    .from('stage_targets')
    .select('*')
    .order('sort_order')

  const targets = (data ?? []) as StageTarget[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Edit stage target days and buffer — changes affect all project calculations instantly</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Stage Targets</p>
          <p className="text-xs text-gray-400">All values in days from Mobilisation</p>
        </div>
        <TargetsEditor targets={targets} />
      </div>
    </div>
  )
}
