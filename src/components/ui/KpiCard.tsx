'use client'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  color?: string
}

export function KpiCard({ label, value, sub, color }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-2xl font-semibold ${color ?? 'text-gray-900'}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}
