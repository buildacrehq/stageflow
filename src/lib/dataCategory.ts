import type { DataCategory } from '@/types'

export function parseCategoryParam(raw: string | undefined): DataCategory | 'all' {
  return raw === 'tracked' || raw === 'reference' ? raw : 'all'
}

export function categoryTabCls(active: DataCategory | 'all', tab: DataCategory | 'all') {
  return `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
    active === tab
      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
      : 'text-gray-500 hover:text-gray-700'
  }`
}
